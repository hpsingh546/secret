//jshint esversion:6
//once we download project from internet to check package.json if it is not present then we need to create it using npm init
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const  session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate')
const app = express();
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port,(err)=>{
  if(err)
  console.log(err)
  else
  console.log("succesful created and listening")
});

 
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'I am Harmanpreet singh cse',//long string
  resave: false,
  saveUninitialized: true
 
}))

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGODB_CONNECT);
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});
userSchema.plugin(passportLocalMongoose)

userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());
passport.serializeUser((user,done)=>{//user se user ki id banayega
  done(null,user.id)//req.user me user ki id save karleta ha
})
passport.deserializeUser(async(id,done)=>{//id se user ko dhondta ha
 try
    {
   const user =await User.findById(id)
   done(null,user)
    }
    catch(err){
      done(err,false)
    }
})

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRETS,
  callbackURL: "https://secrets-harman.herokuapp.com/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile)
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

 app.get("/",function (req,res) {
   res.render("home")
 })
 app.get("/auth/google",
 passport.authenticate('google', { scope: ['profile'] }));//here we're going to initiate authentication with Google.line of code here should be enough for us to bring up a pop up that allows the user to sign into their Google account.

 app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),//authenticate locally
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

 app.get("/login",function (req,res) {
  res.render("login")
})
app.get("/register",function (req,res) {
  res.render("register")
})
//3
app.get("/secrets",function (req,res) {
  //This will return all documents with both a key called "secret" and a non-null value.
  User.find({"secret":{$ne:null}},function (err,foundUsers) {////so this code should now look through all of our users in our users collection,look through the secret fields and pick out the users where the secret field is not equal to null.
    if(err)
    console.log(err)
    else{
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }//So if there were any errors then we're going to simply log it but otherwise if indeed we actually did find some users, so foundUsers is not equal to nil, then we're going to res.render our secrets.ejs page and we're going to pass in a variable.
      
    }
  })
})

//1
app.get("/submit",function (req,res) {//1 2 3 show sequence in which our secret is submit and visible to secret page
  if(req.isAuthenticated()){res.render("submit")}
  else{
    res.redirect("/login")
  }
})
//2
app.post("/submit",function (req,res) {//submit secret in there profile inside database at secret field
  console.log(req.user)
  const secret=req.body.secret;
  User.findById(req.user._id,function (err,founduser) {
    if(err)
    console.log(err)
    else{
      if(founduser){
        founduser.secret=secret;
        founduser.save(function () {
          res.redirect("/secrets")
        });
      }
    }
  })
})
app.get('/logout', function(req, res){//Passport exposes a logout() function on req (also aliased as logOut()) that can be called from any route handler which needs to terminate a login session. Invoking logout() will remove the req.user property and clear the login session 
  req.logout();//passport method
  res.redirect('/');
});
app.post("/register",function (req,res) {
  User.register({username:req.body.username}, req.body.password,function(err, user) {//register is  passport-local-mongoose method
    if (err) { 
      console.log(err);
      res.redirect("/register")
     }
    else{//if new user save succesful then we authenticate the user using local strategy and ch once it authenticate it setup a session next handler call whiredirect to secrets page
       passport.authenticate("local")(req,res,function(){
         res.redirect("/secrets")
       })
    }
     });
});
  
  

app.post("/login",function(req,res){//https://www.passportjs.org/concepts/authentication/login/
     
  const newUser=new User({
    username : req.body.username,
    password:req.body.password
  })
  req.logIn(newUser,function(err){//login is passport function that can be used to establish a login session.
    //Passport exposes a login() function on req (also aliased as logIn()) that can be used to establish a login session.
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets")
      })
      // res.redirect("/secrets")//only this will also works
    }
  })

})


