const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
var mysql = require("mysql");

const app = express();
app.use(bodyParser.json());

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "marioskyr",
});
connection.connect();

app.get("/api", (req, res) => {
  res.json({
    message: "Welcome to the api",
  });
});

app.post("/register", (req, res) => {
  let compareUsername = `SELECT * FROM ghosted WHERE username='${req.body.username}'`;
  connection.query(compareUsername, async function (err, results) {
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

        var sql =
          "INSERT INTO `ghosted`(`username`,`email`,`password`) VALUES ('" +
          username +
          "','" +
          mail +
          "','" +
          pass +
          "')";
        connection.query(sql, function (err, result) {
          if (err) throw err;
          console.log("User added");
        });
      } catch {
        res.status(500).send();
      }
    } else {
      console.log("Already exists");
    }
  });
});

app.post("/login", async (req, res) => {
  let userID = req.body.username;

  var getDataLogin = "SELECT * FROM ghosted WHERE username='" + userID + "'";
  console.log(userID);
  console.log(req.body.password);
  connection.query(getDataLogin, async function (err, results) {
    console.log(err, results);
    console.log(results[0].password);
    if (await bcrypt.compare(req.body.password, results[0].password)) {
      jwt.sign({ user: req.body.username }, "secretkey", (err, token) => {
        res.json({
          token: token,
          login: true,
        });
        console.log(token);
      });
    } else {
      console.log("FML");
      res.status(404).send({
        message: "User not found!",
      });
    }
  });
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
