const express = require("express");
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const async = require("async");
const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
const {DateTime} = require("luxon");
const sgTransport = require("nodemailer-sendgrid-transport");
const mysql = require("mysql");
const axios = require("axios");
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const connection = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "ghostedDB",
});

connection.connect();

app.get("/api", (req, res) => {
  res.json({
    message: "Welcome to the api",
  });
});

app.post("/register", (req, res) => {
  const username = req.body.username;
  const compareUsername = "SELECT * FROM ghosted WHERE username=?";

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
        const username = user.name;
        const pass = user.password;
        const mail = user.email;

        const sqlQuery =
          "INSERT INTO `ghosted` (`username`, `email`, `password`) VALUES (?,?,?);";

        connection.query(
          sqlQuery,
          [username, mail, pass],
          function (err, result) {
            if (err) throw err;
            console.log("User added");
	    res.status(201).send({response: "Account was created successfully", statusC: "201"});
          }
        );
      } catch {
        res.status(500).send({
	  response: "There was a problem while creating your account.",
	  statusC: "500",
	});
      }
    } else {
      console.log("Already exists");
      res.status(200).send({
        response: "Username already exists",
	statusC: "200",
      });
    }
  });
});

app.post("/login", async (req, res) => {
  const userID = req.body.username;
  const getDataLogin = "SELECT * FROM ghosted WHERE username=?";

  connection.query(getDataLogin, [userID], async function (err, results) {
	  if(err) throw err;
    if(results.length >= 1) {
    if (await bcrypt.compare(req.body.password, results[0].password)) {
      jwt.sign({ user: req.body.username }, process.env.ACCESS_TOKEN_SECRET, (err, token) => {
        res.json({
	  id: results[0].id,
	  email: results[0].email,
          token: token,
          login: true,
        });
      });
    } else {
      res.status(403).send({
        response: "The password is incorrect. Please try again.",
	statusC: "403"
      });
    }
    } else {
        res.status(200).send({
	   response: "Username not found.",
	   statusC: "404",
	})
  };
  })
});

app.post("/forgot/pass", async (req, res, next) => {
   const email = req.body.email;
   async.waterfall([
    function (done) {
	crypto.randomBytes(3,function (err, buf) {
	 const token = buf.toString("hex");
	 done(err, token);
       });
    },
    function (token, done) {
     const resetPasswordToken = token;
     const resetPasswordExpires = Math.floor(Date.now() / 1000); // 1 hour
	    console.log(resetPasswordExpires);
	
	const addToken = 'UPDATE ghosted SET resetPasswordToken=?, resetPasswordExpires=? WHERE email=?;'
	connection.query(addToken, [resetPasswordToken, resetPasswordExpires, email], function(err, result) {
		if(err) throw err;
		console.log('Added token and expiry date for ' + email);
	})
        sgMail.setApiKey(process.env.API_KEY_SENDMAIL);

	const options = {
	 service: 'SendGrid',
         auth: {
             api_user: process.env.USER_SENDMAIL,
	     api_key: process.env.PASS_SENDMAIL,    
  	 }
        }

     const client = nodemailer.createTransport(sgTransport(options));

     const mailOptions = {
       from: 'info@mariosk.dev',
       to: email,
       subject: 'Ghosted Change Password',
       html: "You are receiving this because you (or someone else) have requested the reset of the password for this account. <br/><br/>" +
	     "Please write or paste the following code in the corresponsing field box to complete the verification. <br/><br/>" +
	     "<p style='font-weight: bold; font-size: 22px;'>" + resetPasswordToken + "</p>" +
	     "<b><u><i>The code only works for one hour (1 hour).</i></u></b> <br/><br/><br/>" +
	     "If you (or someone you know) did not request this, please ignore this email and your password will remain unchanged." +
	     "<p>&copy; Ghosted | 2020</p>"
     };

     const userCheck = "SELECT * FROM ghosted WHERE email=?";
     connection.query(userCheck, [email], function(err, result) {
     if(err) throw err;   
     console.log(result);
     if(result.length >= 1) {
     sgMail.send(mailOptions).then(() => {
       console.log('Email sent'); 
     })
	    .catch((error) => {
		    console.log(error) 
	    })
     	  }
      })
      res.status(200).send({
        response: "If you have an account with us we've sent an email",
        statusC: "200"
      })
    }
  ]);
})

app.post("/forgot/verify", async (req,res) => {
	const currentTime = Math.floor(Date.now() / 1000);
	const token = req.body.token;
	console.log(currentTime, token);

	const selectData = "SELECT * FROM ghosted WHERE resetPasswordToken=?;";
	connection.query(selectData, [token], function(err, result) {
	   if(err) throw err;
	   
	   if(result.length < 1) {
	      res.sendStatus(404);
	   } else if(result[0].resetPasswordExpires+3600 > currentTime) {
	      const updatePassword = "UPDATE ghosted SET password=? WHERE resetPasswordToken=?;";
	      const pass = req.body.password;

	      async function insertPassword() {
	      	const hashedPass = await bcrypt.hash(pass, 10);	       
	      	connection.query(updatePassword, [hashedPass, token], function(err, results) {
			if(err) throw err;
			   console.log('Password Updated');
			   res.status(200).send({ response: "Password was updated successfully", statusC: "200"});
	      		});
		sgMail.setApiKey(process.env.API_KEY_SENDMAIL);

		const options = {
			service: "SendGrid",
			auth: {
			   api_user: process.env.USER_SENDMAIL,
			   api_key: process.env.PASS_SENDMAIL,
	      		}
		}
		      const client = nodemailer.createTransport(sgTransport(options));
		     
		      const email = result[0].email;
		      const mailChanged = {
			      from: "info@mariosk.dev",
			      to: email,
			      subject: "Ghosted - Password Changed",
			      html:
			      	 "You are receiving this because your password was changed.<br/><br/>" +
			      	 "If you did not change your password please change it immediately or contact us on:<br/><br/>"+
			      	 "<p style='font-size: 22px; font-weight: bold;'>info@mariosk.dev</p><br/><br/><br/>" +
			      	 "With your email and your old password. We can only help within 2 hours.<br/><br/>" +
			      	 "<p>&copy; Ghosted | 2020</p>",
		    }
		    sgMail.send(mailChanged).then(() => { 
				console.log("Reset email sent!") 
				res.status(200).send({ response: "Password was updated successfully", statusC: "200"});
	      		})

	      }
		   insertPassword();
		   
	   } else if(result[0].resetPasswordExpires+3600 < currentTime) {
		  const removeToken = "UPDATE ghosted SET resetPasswordToken=?, resetPasswordExpires=? WHERE email=?;";
		  const email = result[0].email;
		  connection.query(removeToken, [null, null, email]);
		  console.log('Set to NULL');
		  res.status(403).send({response: "The token is expired.", statusC: "403"});
	   }
	})
})

/* Movie Watchlist */
app.post("/api/bookmarked", (req, res) => {
  const bookID = req.body.bookmarkID;
  const uid = req.body.uid;
  const ins = req.body.bookmarked

	if(ins===true) {
		const insertTo = "INSERT INTO bookmarks (id, bookmarkID, status) VALUES (?,?,?);";
		connection.query(insertTo, [uid, bookID, false], (error) => {
			if(error) console.error(error)
			res.end();
		})
  	} else if(ins===false){
		const deleteFrom = "DELETE FROM bookmarks WHERE id=? AND bookmarkID=?;";
		connection.query(deleteFrom, [uid, bookID], (error) => {
			if(error) console.error(error);

			res.end();
		});
	}
})

app.post("/api/checkBookmark", (req, res) => {
	const checkID = req.body.uid;
	const MID = req.body.mid;
	const checkDB = "SELECT * FROM bookmarks WHERE id=? AND bookmarkID=?";
	console.log(checkID)
	connection.query(checkDB, [checkID, MID], (req, results) => {
		console.log(results)
		if(results.length < 1) {
			res.status(200).send({booked: false});
		} else {
			res.status(200).send({booked: true});
		}
	})
});

app.post("/api/watchlist", (req, res) => {
  const uid = req.body.uid;
  const getBookmarked = "SELECT * FROM bookmarks WHERE id=?";
  connection.query(getBookmarked, [uid], async (req, resp) => {
    let ids = resp.map((i) => ({
	id: i.bookmarkID,
	statusOf: i.status,
    }))
  
    var action = () => {
	  Promise.all(
	  ids.map(async(u) => {
    	  	let mData = await axios.get('https://api.themoviedb.org/3/movie/'+u.id+'?api_key='+process.env.API_KEY_MOVIES);
		let statusOf = u.statusOf;
		
		return [mData.data, statusOf];
    	  })
	  ).then((values) => {
	  	res.send(values)
	  })
    }
	action();
  })
})

app.post("/api/updateStatus", (req, res) => {
	const setStatus = req.body.statusInfo;
	const uid = req.body.uid;
	const bid = req.body.bid;
	const updateStats = "UPDATE bookmarks SET status=? WHERE id=? AND bookmarkID=?";
	connection.query(updateStats, [setStatus, uid, bid])
})

/* TV Watchlist */
app.post("/api/bookmarkedTV", (req, res) => {
  const tvID = req.body.tvID;
  const uid = req.body.uid;
  const ins = req.body.bookmarked;
  console.log(ins)
  if (ins === true) {
    const insertTV = "INSERT INTO bookmarksTV (id, tvID, status) VALUES (?,?,?);";
    connection.query(insertTV, [uid, tvID, false], (error) => {
      if (error) console.error(error)
      res.end();
    })
  } else if(ins===false) {
    const removeTV = "DELETE FROM bookmarksTV WHERE id=? AND tvID=?;";
    connection.query(removeTV, [uid, tvID], (error) => {
      if (error) console.error(error)
      res.end();
    })
  }
})
app.post("/api/checkBookmarkTV", (req, res) => {
	const tvID = req.body.tvid;
  const uid = req.body.uid;
	console.log(tvID, uid)
  const checkDB = "SELECT * FROM bookmarksTV WHERE id=? AND tvID=?";
	connection.query(checkDB, [uid, tvID], (req, results) => {
		console.log(results)
		if(results.length < 1) {
			res.status(200).send({booked: false});
		} else {
			res.status(200).send({booked: true});
		}
	})
});

app.post("/api/watchlistTV", (req, res) => {
  const uid = req.body.uid;
  const getBookmarkedTV = "SELECT * FROM bookmarksTV WHERE id=?";
  connection.query(getBookmarkedTV, [uid], async (req, resp) => {
    let ids = resp.map((i) => ({
      id: i.tvID,
      statusOf: i.status,
    }))
  
    var action = () => {
	  Promise.all(
	  ids.map(async(u) => {
    	  	let mData = await axios.get('https://api.themoviedb.org/3/tv/'+u.id+'?api_key='+process.env.API_KEY_MOVIES);
		let statusOf = u.statusOf;
		
		return [mData.data, statusOf];
    	  })
	  ).then((values) => {
	  	res.send(values)
	  })
    }
	action();
  })
})

app.post("/api/updateStatusTV", (req, res) => {
	const setStatus = req.body.statusInfo;
	const uid = req.body.uid;
	const tid = req.body.tid;
	const updateStats = "UPDATE bookmarksTV SET status=? WHERE id=? AND tvID=?";
	connection.query(updateStats, [setStatus, uid, tid])
})

app.get("/api/posts", verifyToken, (req, res) => {
  jwt.verify(req.token, process.env.ACCESS_TOKEN_SECRET, (err, authData) => {
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
