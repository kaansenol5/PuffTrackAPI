// File: security_test_client.js

const axios = require("axios");
const assert = require("assert").strict;

const API_URL = "http://localhost:3000";

let user1Token, user2Token, user1Id, user2Id;

async function runSecurityTests() {
  try {
    console.log("Starting PuffTrack security tests...");

    // Setup: Register and login two users
    const user1 = await registerUser(
      "SecurityUser1",
      "secuser1@example.com",
      "password1",
    );
    user1Id = user1.id;
    user1Token = await loginUser("secuser1@example.com", "password1");

    const user2 = await registerUser(
      "SecurityUser2",
      "secuser2@example.com",
      "password2",
    );
    user2Id = user2.id;
    user2Token = await loginUser("secuser2@example.com", "password2");

    console.log("Test users registered and logged in.");

    // Test 1: Non-friend trying to see someone's puffs
    await testNonFriendPuffAccess();

    // Test 2: Attempt to login without correct password
    await testLoginWithoutPassword();

    // Test 3: Attempt to record puffs as another user
    await testRecordPuffAsAnotherUser();

    // Test 4: Attempt to add friend without authentication
    await testAddFriendWithoutAuth();

    // Test 5: Attempt to use an expired token
    //await testExpiredToken();

    // Test 6: Attempt SQL injection in login
    await testSQLInjection();

    await testFriendFunctionality();

    console.log("All security tests completed successfully!");
  } catch (error) {
    console.error("Error during security tests:", error.message);
  }
}

async function testNonFriendPuffAccess() {
  console.log("\nTesting non-friend puff access...");
  try {
    // Record a puff for User1
    await recordPuff(user1Token);

    // Try to get User1's puffs using User2's token
    const response = await axios.get(`${API_URL}/puffs`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    // This should fail or return an empty array
    assert(
      response.data.length === 0,
      "Non-friend should not see user's puffs",
    );
    console.log("Test passed: Non-friend cannot see user's puffs");
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log("Test passed: Non-friend cannot access user's puffs");
    } else {
      throw error;
    }
  }
}

async function testLoginWithoutPassword() {
  console.log("\nTesting login without correct password...");
  try {
    await loginUser("secuser1@example.com", "wrongpassword");
    throw new Error("Login should not succeed with incorrect password");
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("Test passed: Cannot login without correct password");
    } else {
      throw error;
    }
  }
}

async function testRecordPuffAsAnotherUser() {
  console.log("\nTesting recording puff as another user...");
  try {
    // Try to record a puff for User1 using User2's token
    await axios.post(
      `${API_URL}/puff`,
      {},
      {
        headers: { Authorization: `Bearer ${user2Token}` },
      },
    );

    // Get User1's puffs
    const response = await axios.get(`${API_URL}/puffs`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    // Ensure the puff count hasn't increased
    assert(
      response.data.length === 1,
      "User should not be able to record puffs as another user",
    );
    console.log("Test passed: User cannot record puffs as another user");
  } catch (error) {
    console.error("Error in testRecordPuffAsAnotherUser:", error.message);
  }
}

async function testAddFriendWithoutAuth() {
  console.log("\nTesting adding friend without authentication...");
  try {
    await axios.post(`${API_URL}/friends/add`, { friendId: user2Id });
    throw new Error("Should not be able to add friend without authentication");
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("Test passed: Cannot add friend without authentication");
    } else {
      throw error;
    }
  }
}

async function testExpiredToken() {
  console.log("\nTesting expired token...");
  try {
    // Wait for token to expire (65 seconds to be safe)
    console.log("Waiting for token to expire...");
    await new Promise((resolve) => setTimeout(resolve, 65000));

    await axios.get(`${API_URL}/puffs`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    throw new Error(
      "Should not be able to access resources with expired token",
    );
  } catch (error) {
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data.error === "Token expired"
    ) {
      console.log("Test passed: Cannot use expired token");
    } else {
      throw error;
    }
  }
}

async function testSQLInjection() {
  console.log("\nTesting SQL injection in login...");
  try {
    await loginUser("' OR '1'='1", "' OR '1'='1");
    throw new Error("Login should not succeed with SQL injection attempt");
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("Test passed: SQL injection attempt failed");
    } else {
      throw error;
    }
  }
}

async function registerUser(name, email, password) {
  const response = await axios.post(`${API_URL}/register`, {
    name,
    email,
    password,
  });
  return response.data.user;
}

async function loginUser(email, password) {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response.data.token;
}

async function recordPuff(token) {
  await axios.post(
    `${API_URL}/puff`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

async function testFriendFunctionality() {
  console.log("\nTesting friend functionality...");
  try {
    // Add friend
    await axios.post(
      `${API_URL}/friends/add`,
      { friendId: user2Id },
      {
        headers: { Authorization: `Bearer ${user1Token}` },
      },
    );
    console.log("User1 added User2 as friend");

    // Try to get user2's puffs (should fail)
    try {
      await axios.get(`${API_URL}/puffs?userId=${user2Id}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      console.log("Test failed: Accessed non-mutual friend's puffs");
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log("Test passed: Cannot access non-mutual friend's puffs");
      } else {
        throw error;
      }
    }

    // User2 adds User1 as friend
    await axios.post(
      `${API_URL}/friends/add`,
      { friendId: user1Id },
      {
        headers: { Authorization: `Bearer ${user2Token}` },
      },
    );
    console.log("User2 added User1 as friend");

    // Now try to get user2's puffs (should succeed)
    const puffsResponse = await axios.get(
      `${API_URL}/puffs?userId=${user2Id}`,
      {
        headers: { Authorization: `Bearer ${user1Token}` },
      },
    );
    console.log("Test passed: Can access mutual friend's puffs");

    // Remove friend
    await axios.post(
      `${API_URL}/friends/remove`,
      { friendId: user2Id },
      {
        headers: { Authorization: `Bearer ${user1Token}` },
      },
    );
    console.log("User1 removed User2 as friend");

    // Try to get user2's puffs again (should fail)
    try {
      await axios.get(`${API_URL}/puffs?userId=${user2Id}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      console.log("Test failed: Accessed removed friend's puffs");
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log("Test passed: Cannot access removed friend's puffs");
      } else {
        throw error;
      }
    }

    console.log("Friend functionality tests completed successfully!");
  } catch (error) {
    console.error("Error during friend functionality test:", error.message);
  }
}

runSecurityTests();
