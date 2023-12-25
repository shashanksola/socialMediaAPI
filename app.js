const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Error Message ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const authenticateJwtToken = async (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "Bankai", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;

  if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const checkExistingUsername = `
        SELECT * FROM user WHERE username = '${username}';
    `;

    const userData = await db.get(checkExistingUsername);
    if (userData !== undefined) {
      response.status(400);
      response.send("User already exists");
    } else {
      const encryptedPassword = await bcrypt.hash(password, 10);
      const createNewUserQuery = `
            INSERT INTO user (name, username, password, gender)
            VALUES (
                '${name}',
                '${username}',
                '${encryptedPassword}',
                '${gender}'
            );
        `;

      await db.run(createNewUserQuery);
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const checkAccountExistence = `
        SELECT * FROM user WHERE username = '${username}';
    `;

  const userDetails = await db.get(checkAccountExistence);

  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const decryptedPassword = await bcrypt.compare(
      password,
      userDetails.password
    );
    if (decryptedPassword) {
      const jwtToken = await jwt.sign({ username, password }, "Bankai");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get(
  "/user/tweets/feed/",
  authenticateJwtToken,
  async (request, response) => {
    const getUserDetailsQuery = `
        SELECT * FROM user WHERE username = '${request.username}';
      `;
    const userDetails = await db.get(getUserDetailsQuery);
    const userId = userDetails.user_id;

    const getFollowingUsers = `
        SELECT following_user_id FROM follower WHERE follower_user_id = ${userId};
    `;
    const followingUserIds = await db.all(getFollowingUsers);
    console.log(followingUserIds);
    console.log(userId);
  }
);

console.log("hi1");
console.log(
  bcrypt.getRounds(
    "$2b$10$F/fLVmOjBnj0cj1y0tCS3uTJS6LCtLk1TaM5WqCVYC7ikMlIqY0re"
  )
);
