// Firebase Auth ユーザー一覧確認スクリプト
require('dotenv').config({ path: '.env.local' });

import { adminAuth } from "../lib/firebase/admin";

async function listUsers() {
  try {
    console.log("Registered Auth Users:");
    const listUsersResult = await adminAuth.listUsers(100);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`- UID: ${userRecord.uid}, Email: ${userRecord.email}, Claims:`, userRecord.customClaims);
    });
    if (listUsersResult.users.length === 0) {
      console.log("No users found.");
    }
  } catch (error) {
    console.error("Error listing users:", error);
  }
}

listUsers();
