import bycrypt from "bcrypt";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findPublicUserById,
} from "../../../shared/db/repositories/auth.repository";
import { generateAccessToken } from "../utils/token";
import { AppError } from "../errors/app-error";

type RegisterInput = {
  username: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

export const register = async (input: RegisterInput) => {
  const existingUserByEmail = await findUserByEmail(input.email);
  if (existingUserByEmail)
    throw new AppError("Email already exists", "EMAIL_ALREADY_EXISTS", 400);
  const existingUserByUsername = await findUserByUsername(input.username);
  if (existingUserByUsername)
    throw new AppError(
      "Username already exists",
      "USERNAME_ALREADY_EXISTS",
      400,
    );
  const passwordHash = await bycrypt.hash(input.password, 10);
  const user = await createUser({
    username: input.username,
    email: input.email,
    passwordHash: passwordHash,
  });
  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });
  return { user, token };
};

export const login = async (input: LoginInput) => {
  const user = await findUserByEmail(input.email);
  if (!user)
    throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401);
  const isPasswordValid = await bycrypt.compare(
    input.password,
    user.passwordHash,
  );
  if (!isPasswordValid)
    throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401);
  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    token,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await findPublicUserById(userId);
  if (!user) throw new AppError("User not found", "USER_NOT_FOUND", 404);
  return user;
};
