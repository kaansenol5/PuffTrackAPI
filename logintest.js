const axios = require("axios");

const BASE_URL = "http://localhost:3000";
let token = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function register(name, email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/register`, {
      name,
      email,
      password,
    });
    console.log("Registration response:", response.data);
    return response.data.token;
  } catch (error) {
    console.error(
      "Registration error:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
}

async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      email,
      password,
    });
    console.log("Login response:", response.data);
    return response.data.token;
  } catch (error) {
    console.error(
      "Login error:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
}

function logout() {
  token = null;
  console.log("Logged out");
}

async function main() {
  try {
    // Register
    console.log("Registering...");
    token = await register("Test User", "testuser@example.com", "password123");

    // Login
    console.log("Logging in...");
    token = await login("testuser@example.com", "password123");

    // Logout
    console.log("Logging out...");
    logout();

    // Wait for 30 seconds
    console.log("Waiting for 30 seconds...");
    await sleep(30000);

    // Login again
    console.log("Logging in again...");
    token = await login("testuser@example.com", "password123");

    console.log("Script completed successfully");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
