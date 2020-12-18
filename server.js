const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
var mysql = require("mysql");

const app = express();
app.use(bodyParser.json());

var connection = mysql.createConnection({
  host: "localhost",
  user: "",
  password: "",
  database: "",
});
connection.connect();

console.log("Connection acquired!");

app.get("/api", (req, res) => {
  res.json({
    message: "Welcome to the api",
  });
});

app.post("/register", (req, res) => {
  let username = req.body.username;
  let compareUsername = "SELECT * FROM ghosted WHERE username=?";

  connection.query(compareUsername, [username], async function (err, results) {
    if (err) throw err;

    if (results < 1) {
      try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = {
          name: req.body.username,
          password: hashedPassword,
          email: req.body.email,
        };

        // Get data into DB
        let username = user.name;
        let pass = user.password;
        let mail = user.email;

        let sqlQuery =
          "INSERT INTO `ghosted` (`username`, `email`, `password`) VALUES (?,?,?);";

        connection.query(
          sqlQuery,
          [username, mail, pass],
          function (err, result) {
            if (err) throw err;
            console.log("User added");
            res.status(201).send("User created");
          }
        );
      } catch {
        res.status(500).send();
      }
    } else {
      console.log("Already exists");
      res.status(200).send({
        response: "Username already exists",
      });
    }
  });
});

app.post("/login", async (req, res) => {
  let userID = req.body.username;
  var getDataLogin = "SELECT * FROM ghosted WHERE username=?";

  connection.query(getDataLogin, [userID], async function (err, results) {
    if (await bcrypt.compare(req.body.password, results[0].password)) {
      jwt.sign({ user: req.body.username }, "secretkey", (err, token) => {
        res.json({
          token: token,
          login: true,
        });
      });
    } else {
      res.status(404).send({
        message: "User not found!",
      });
    }
  });
});

app.post("/forgot/pass", async (req, res) => {
  let email = req.body.email;
});

app.get("/api/posts", verifyToken, (req, res) => {
  jwt.verify(req.token, "secretkey", (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      res.json({
        message: "Post created...",
        authData: authData,
        token: req.token,
      });
    }
  });
});
// Format of token
// Authorization: Bearer <accessToken>

// Verify Token
function verifyToken(req, res, next) {
  // Get auth header value
  const bearerHeader = req.headers["authorization"];
  //Check if bearer is undefined
  if (typeof bearerHeader !== "undefined") {
    // Split at the space
    const bearer = bearerHeader.split(" ");
    // Get token from array
    const bearerToken = bearer[1];
    // Set the token
    req.token = bearerToken;
    // Next middleware
    next();
  } else {
    // Forbidden
    res.sendStatus(403);
  }
}

app.listen(3000);
