const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
var mysql = require("mysql");
var bodyParser = require("body-parser");

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "marioskyr",
});
connection.connect();

app.use(express.json());

const users = [];

app.get("/users", (req, res) => {
  res.json(users);
});

app.post("/users", async (req, res) => {
  let compareUsername =
    "SELECT * FROM ghosted WHERE username = '" + req.body.username + "'";
  connection.query(compareUsername, async function (err, results) {
    if (err) throw err;
    console.log("Shit can be added");

  if (results < 1) {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = {
        name: req.body.username,
        password: hashedPassword,
        email: req.body.email,
      };
      users.push(user);
      res.status(201).send();
      console.log("Successfully added User!");

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
        console.log("Shit added");
      });
    } catch {
      res.status(500).send();
    }
  } else {
    console.log("Already exists");
  }
});
});

app.post("/users/login", async (req, res) => {
  const user = users.find((user) => user.name == req.body.username);
  if (user == null) {
    console.log("Cannot find user");
  }
  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      res.send("Success");
      console.log("Success");
    } else {
      res.send("Not allowed");
      console.log("Not allowed");
    }
  } catch {
    res.status(500).send();
  }
});

app.listen(3000);
