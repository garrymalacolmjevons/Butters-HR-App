import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database with initial data...");
  
  // Check if admin user exists
  const adminUser = await db.select().from(users).where(eq(users.username, "admin"));
  
  if (adminUser.length === 0) {
    // Create admin user
    await db.insert(users).values({
      username: "admin",
      password: "admin123",
      fullName: "Admin User",
      company: "Butters",
      isAdmin: true
    });
    console.log("Created admin user");
  } else {
    console.log("Admin user already exists");
  }
  
  // Check if HR manager user exists
  const hrUser = await db.select().from(users).where(eq(users.username, "hrmanager"));
  
  if (hrUser.length === 0) {
    // Create HR manager user
    await db.insert(users).values({
      username: "hrmanager",
      password: "hr123456", // Updated to meet 6-character minimum
      fullName: "HR Manager",
      company: "Makana",
      isAdmin: false
    });
    console.log("Created HR manager user");
  } else {
    console.log("HR manager user already exists");
  }
}

// Export the seed function
export { seed };