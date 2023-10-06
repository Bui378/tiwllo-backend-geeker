import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "./models/User";
require("dotenv").config();
const jwtOptions = {
  secretOrKey: process.env.JWT_SECRET,
  // secretOrKey: "a984thjn4q4ki4",
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
};

const jwt = async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);

    if (user) return done(null, user);

    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
};

export default { jwt: new JwtStrategy(jwtOptions, jwt) };
