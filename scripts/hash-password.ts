import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}

// Output goes into ADMIN_PASSWORD_HASH in .env (never commit real secrets).
console.log(bcrypt.hashSync(password, 10));
