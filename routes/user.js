const route = require("express-promise-router")();
const bcrypt = require("bcrypt");
const { User, validate } = require("../db/models/user");
const _ = require("lodash");
const auth = require("../middleware/auth");

route.get("/", async (req, res) => {
  let users = await User.find();

  res.send(users.map((user) => _.pick(user, ["fullName", "isTeacher"])));
});

route.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //check if username already exists in database
  let user = await User.findOne({ userName: req.body.userName });
  if (user) return res.status(400).send("Username already exists.");

  const salt = await bcrypt.genSalt(10);
  req.body.hashedPassword = await bcrypt.hash(req.body.password, salt);
  // req.body.hashedPassword =
  user = new User(
    _.pick(req.body, [
      "userName",
      "fullName",
      "hashedPassword",
      "email",
      "isTeacher",
      "isAdmin",
    ])
  );
  res.send(await user.save());
});

//only able to update phone number!
//user needs to login first.
route.put("/", auth, async (req, res) => {
  const user = User.findById(req.user._id);
  user.phoneNumber = req.phoneNumber;
  await user.save();
  res.send(user.phoneNumber);
});

//TBD code implementation. Need to create admin flag in user schema first
route.delete("/:username", auth, async (req, res) => {
  const { userName, isAdmin } = req.user;

  if (!isAdmin) {
    return res.status(404).send("Unauthorized user!");
  }
  if (userName == req.params.userName) {
    return res
      .status(401)
      .send("You are not allowed to delete yourself from the database!");
  }

  const user = await User.findOne({ userName: req.params.username });
  if (!user) {
    return res.status(400).send("No such user exist in the database!");
  }

  const { err, product } = await user.deleteOne();
  if (!err) return res.send(product);
});

route.get("/me", auth, async (req, res) => {
  const { userName } = req.user;
  const user = await User.findOne({ userName });
  if (!user) return res.status(400).send("No such user!");
  res.send(_.pick(user, ["userName"]));
});

module.exports = route;
