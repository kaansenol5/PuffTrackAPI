// contactUtil.js
const fs = require("fs").promises;
const path = require("path");

const CONTACTS_FILE = path.join(__dirname, "data", "contacts.json");

// Ensure the data directory exists
async function ensureDataDirectory() {
  const dir = path.dirname(CONTACTS_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Initialize contacts file if it doesn't exist
async function initContactsFile() {
  try {
    await fs.access(CONTACTS_FILE);
  } catch {
    await fs.writeFile(CONTACTS_FILE, JSON.stringify([], null, 2));
  }
}

async function saveContact(name, email, message) {
  try {
    await ensureDataDirectory();
    await initContactsFile();

    // Read existing contacts
    const contactsData = await fs.readFile(CONTACTS_FILE, "utf8");
    const contacts = JSON.parse(contactsData);

    // Add new contact with timestamp
    contacts.push({
      id: Date.now().toString(),
      name,
      email,
      message,
      timestamp: new Date().toISOString(),
    });

    // Write back to file
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving contact:", error);
    return false;
  }
}

module.exports = { saveContact };
