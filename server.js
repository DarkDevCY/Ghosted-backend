const express = require("express");
const app = express();
const bcrypt = require("bcrypt");

app.use(express.json());

const users = [];

app.get("/users", (req, res) => {
  res.json(users);
});

app.post("/users", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = { name: req.body.username, password: hashedPassword };
    users.push(user);
    res.status(201).send();
    console.log("Successfully added User!");
  } catch {
    res.status(500).send();
  }
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
