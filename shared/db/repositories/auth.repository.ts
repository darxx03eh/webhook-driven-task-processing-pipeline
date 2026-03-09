import { eq } from 'drizzle-orm';
import { db } from '../index';
import { users } from '../schema';

export const findUserByEmail = async (email: string) => {
    return db.query.users.findFirst({
        where: eq(users.email, email)
    });
};

export const findUserByUsername = async (username: string) => {
    return db.query.users.findFirst({
        where: eq(users.username, username)
    });
};

type CreateUserInput = {
    username: string;
    email: string;
    passwordHash: string;
};

export const createUser = async (input: CreateUserInput) => {
    const [user] = await db.insert(users)
    .values({
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash
    }).returning({
        id: users.id,
        username: users.username,
        email: users.email
    });
    return user;
};

export const findPublicUserById = async (userId: string) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            username: true,
            email: true,
            createdAt: true
        }
    });
    return user;
};