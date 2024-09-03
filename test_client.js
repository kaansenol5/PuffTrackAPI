// File: test_client.js

const axios = require("axios");

const API_URL = "http://localhost:3000";

let user1Token, user2Token;

async function runTest() {
  try {
    console.log("Starting PuffTrack client test...");

    // Register two users
    const user1 = await registerUser("User1", "user1@example.com", "password1");
    console.log("User 1 registered:", user1.name);

    const user2 = await registerUser("User2", "user2@example.com", "password2");
    console.log("User 2 registered:", user2.name);

    // Login both users
    user1Token = await loginUser("user1@example.com", "password1");
    console.log("User 1 logged in");

    user2Token = await loginUser("user2@example.com", "password2");
    console.log("User 2 logged in");

    // Record puffs for User 1
    await recordPuff(user1Token);
    await recordPuff(user1Token);
    console.log("Recorded 2 puffs for User 1");

    // Get puffs for User 1
    const user1Puffs = await getPuffs(user1Token);
    console.log("User 1 puffs:", user1Puffs);

    // Add User 2 as friend of User 1
    await addFriend(user1Token, user2.id);
    console.log("Added User 2 as friend of User 1");

    // Get friends of User 1
    const user1Friends = await getFriends(user1Token);
    console.log("User 1 friends:", user1Friends);

    // Set up real-time puff listening for User 2
    //

    // Record a puff for User 1 (should be received by User 2 in real-time)
    await recordPuff(user1Token);
    console.log("Recorded another puff for User 1");

    // Wait for a moment to ensure the real-time event is received
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("PuffTrack client test completed successfully!");
  } catch (error) {
    console.error("Error during test:", error.message);
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

async function getPuffs(token) {
  const response = await axios.get(`${API_URL}/puffs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function addFriend(token, friendId) {
  await axios.post(
    `${API_URL}/friends/add`,
    { friendId },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

async function getFriends(token) {
  const response = await axios.get(`${API_URL}/friends`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

runTest();
