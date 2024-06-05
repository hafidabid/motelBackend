require("dotenv").config();
const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const House = require("../models/house.model");
const { v4: uuidv4 } = require('uuid');
const ethUtil = require('ethereumjs-util')
const esu = require('eth-sig-util')

const saltRounds = 10;
const daysToSeconds = 1 * 60 * 60; //   days * hours *  minutes *  seconds
const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + daysToSeconds;

exports.signUp = async (req, res, next) => {
  try {
    const payload = req.body;
    console.log(payload)
    if (!payload.name) {
      throw new Error("Please provide user name");
    }
    if (!payload.emailId) {
      throw new Error("Please provide email id");
    }
    if (!payload.birthDate) {
      throw new Error("Please provide date of birth");
    }

    if(!payload.ethAddress){
      throw new Error("No ETH address given");
    }

    // find user first
    const currentUser = await User.findOne({
      ethAddress: payload.ethAddress
    })

    if(!currentUser){
      throw new Error("User not found");
    }

    if(currentUser.status === "Complete"){
      throw new Error("User has complete registration before");
    }

    if(!payload.signature){
      throw new Error("No ETH signature given");
    }

    // verify signature first
    const msg = `nonce_${currentUser.nonce}`
    const msgBufferHex = ethUtil.bufferToHex(Buffer.from(msg, 'utf8'));
    const address = esu.recoverPersonalSignature({
      data: msgBufferHex,
      sig: payload.signature
    })
    console.log(currentUser.ethAddress, address)
    if(address.toLowerCase() !== currentUser.ethAddress){
      throw new Error("Invalid signature");
    }

    currentUser.name = {
      firstName: payload.name.firstName,
      lastName: payload.name.lastName,
    }

    currentUser.emailId = payload.emailId
    currentUser.birthDate = payload.birthDate
    currentUser.password = ""

    await currentUser.save();
    const findCriteria = {
      emailId: payload.emailId,
    };
    const userDetails = await User.find(findCriteria);

    const accessToken = jwt.sign(
      {
        _id: userDetails[0]._id,
        role: userDetails[0].role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: expirationTimeInSeconds }
    );
    const refreshToken = jwt.sign(
      { _id: userDetails[0]._id, role: userDetails[0].role },
      process.env.REFRESH_TOKEN_SECRET
    );

    const updatedUser = await User.findOneAndUpdate(
      findCriteria,
      { accessToken: accessToken, refreshToken: refreshToken },
      { new: true }
    );

    let response = {
      info: "Welcome to motel",
      success: 1,
      status: 200,
      accessToken: accessToken,
      refreshToken: refreshToken,
      user_details: updatedUser,
    };
    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    let response = {
      info: "Failed to create user",
      success: 0,
      status: 500,
    };
    res.status(500).json({ response });
  }
};

exports.logIn = async (req, res) => {
  const payload = req.body;
  const email = payload.ethAddress.toString().toLowerCase();

  const findCriteria = {
    ethAddress: email,
  };
  const userDetails = await User.findOne(findCriteria);

  if(!userDetails){
    throw new Error(`user not found!`)
  }

  try {
    const msg = `nonce_${userDetails.nonce}`
    const msgBufferHex = ethUtil.bufferToHex(Buffer.from(msg, 'utf8'));
    const address = esu.recoverPersonalSignature({
      data: msgBufferHex,
      sig: payload.signature
    })
    if (address.toLowerCase() === userDetails.ethAddress) {
      const accessToken = jwt.sign(
        {
          _id: userDetails._id,
          role: userDetails.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: expirationTimeInSeconds }
      );
      const refreshToken = jwt.sign(
        { _id: userDetails._id, role: userDetails.role },
        process.env.REFRESH_TOKEN_SECRET
      );

      const updatedUser = await User.findOneAndUpdate(
        findCriteria,
        { accessToken: accessToken, refreshToken: refreshToken },
        { new: true }
      );
      let response = {
        info: "Successfully logged in",
        success: 1,
        status: 200,
        accessToken: accessToken,
        refreshToken: refreshToken,
        user_details: updatedUser,
      };
      res.send(response);
    } else {
      res.send("Not allowed!");
    }
  } catch (error) {
    console.error(error)
    res.status(500).send({
      error: error.message
    });
  }
};

exports.postUser = async (req, res) => {
  res.send(req.user);
};

exports.refreshToken = async (req, res) => {
  const refreshToken = req.body.refreshToken;
  console.log(refreshToken);

  if (!refreshToken) {
    return res.sendStatus(404).send("Please Log in");
  } else {
    try {
      let decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const userId = decoded._id;
      const findCriteria = {
        _id: new mongoose.Types.ObjectId(userId),
      };
      const userDetails = await User.findById(findCriteria);
      
      if (userDetails.refreshToken !== refreshToken) {
        return res.sendStatus(403);
      }

      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (error, user) => {
          if (error) {
            return res.sendStatus(401);
          }

          const accessToken = jwt.sign(
            {
              _id: userDetails._id,
              role: userDetails.role,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: expirationTimeInSeconds }
          );
          console.log(accessToken, "AccessToken");

          res.json({ accessToken: accessToken });
        }
      );
    } catch (error) {
      console.error(error);
      res.status(401).send("Invalid refresh token");
    }
  }
};

exports.logOut = async (req, res) => {
  const userId = req.user;
  try {
    const userDetails = await User.updateOne(
      { _id: userId },
      {
        $unset: {
          accessToken: "",
          refreshToken: "",
        },
      }
    );
    res.send("User logout");
  } catch (error) {
    console.log(error, "Logout error");
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user;
    const findCriteria = {
      _id: new mongoose.Types.ObjectId(userId),
    };

    const userDetails = await User.findById(findCriteria);

    const housesData = await House.find({ author: userId });

    let response = {
      info: "user exists",
      status: 200,
      success: 1,
      user_details: userDetails,
      house_data: housesData,
    };
    res.send(response);
  } catch (error) {
    console.log(error, "LINE 202");
  }
};

exports.checkEmail = async (req, res) => {
  try {
    const payload = req.body;
    console.log(payload);
    const findCriteria = {
      emailId: payload.email,
    };
    const isEmailExist = await User.find(findCriteria);
    console.log(isEmailExist);
    let response;
    if (isEmailExist.length !== 0) {
      response = {
        info: "User email exist.",
        success: 1,
        status: 200,
      };
    } else {
      response = {
        info: "User email doesn't exist.",
        success: 0,
        status: 200,
      };
    }
    res.status(200).send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to search");
  }
};

exports.userProfileDetails = async (req, res) => {
  const userId = req.user;
  const payload = req.body;
  const {
    valueName: [profileDetailsName],
    value: [profileDetailsvalue],
    fieldName,
  } = payload;
  const findCriteria = {
    _id: new mongoose.Types.ObjectId(userId),
  };

  console.log(profileDetailsName, profileDetailsvalue, fieldName, payload);

  try {
    const userDetails = await User.findById(findCriteria).limit(1);

    const userProfile = userDetails.profileDetails.profile;

    if (typeof userProfile === "object") {
      if (fieldName in userProfile) {
        // Update the value of the field
        userProfile[fieldName].name = profileDetailsName;
        userProfile[fieldName].value = profileDetailsvalue;

        // Save the updated user details
        await userDetails.save();

        // console.log("Field updated successfully");
      } else {
        console.log("Field not found");
      }
    } else {
      console.log("userProfile is not an object");
    }

    // Send a response indicating success
    res.status(200).json({ message: "Added successfully" });
  } catch (error) {
    // Handle any errors that occurred during the update process
    console.error("Error updating field:", error);
    res
      .status(404)
      .json({ error: "An error occurred while updating the field" });
  }
};

exports.userProfileAbout = async (req, res) => {
  try {
    const userId = req.user;
    const payload = req.body;
    const { profileDetailsAbout, fieldName } = payload;
    const findCriteria = {
      _id: new mongoose.Types.ObjectId(userId),
    };

    const userDetails = await User.findById(findCriteria).limit(1);

    const userProfile = userDetails.profileDetails;

    if (typeof userProfile === "object") {
      if (fieldName in userProfile) {
        // Update the value of the field
        userProfile[fieldName] = profileDetailsAbout;

        // Save the updated user details
        await userDetails.save();

        console.log("Field updated successfully");
      } else {
        console.log("Field not found");
      }
    } else {
      console.log("userProfile is not an object");
    }

    // Send a response indicating success
    res.status(200).json({ message: "Added successfully" });
  } catch (error) {
    console.error("Error updating field:", error);
    res
      .status(404)
      .json({ error: "An error occurred while updating the field" });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    const profileImg = req.body.profileImg;
    const userId = req.user;
    const findCriteria = {
      _id: new mongoose.Types.ObjectId(userId),
    };
    const userDetails = await User.findOneAndUpdate(
      findCriteria,
      { profileImg: profileImg },
      { new: true }
    );

    let response = {
      info: "Successfully uploded",
      profileImg: userDetails.profileImg,
    };
    res.status(200).send(response);
  } catch (error) {
    console.log(error);
  }
};

exports.userToHost = async (req, res) => {
  try {
    const userId = req.user;
    const role = req.body.role;
    const findCriteria = {
      _id: new mongoose.Types.ObjectId(userId),
    };
    const updatedUserDetails = await User.findOneAndUpdate(
      findCriteria,
      { role: role },
      { new: true }
    );

    const id = {
      author: updatedUserDetails._id,
    };

    const updateNewHouseAuthor = await House(id).save();

    // console.log(updateNewHouseAuthor)

    const response = {
      house: updateNewHouseAuthor,
      updatedUserDetails,
      info: "User role updated",
      succeed: 1,
    };
    res.status(200).send(response);
  } catch (error) {
    console.log(error);
  }
};

exports.checkAddress = async (req, res) => {
  try {
    const payload = req.body;
    const findCriteria = {
     ethAddress: payload.ethAddress.toString().toLowerCase(),
    };
    const isEmailExist = await User.findOne(findCriteria);

    let response;
    if (isEmailExist ) {
      // update nonce
      isEmailExist.nonce = uuidv4()
      await isEmailExist.save()

      response = {
        info: "User email exist.",
        success: (isEmailExist.emailId && isEmailExist.birthDate && isEmailExist.name) ? 1 : 0,
        status: 200,
        nonce: isEmailExist.nonce
      };
    } else {
      // create new user and nonce
      const newUser = new User({
        nonce: uuidv4(),
        ethAddress: payload.ethAddress.toLowerCase()
      })

      await newUser.save()
      response = {
        info: "User email doesn't exist.",
        success: 0,
        status: 200,
        nonce: newUser.nonce
      };
    }
    res.status(200).send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to search");
  }
};
