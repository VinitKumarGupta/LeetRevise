import jwt from "jsonwebtoken";
import { AuthenticatedRequest, authenticateToken } from "./auth.js";

const JWT_SECRET = "leetcode-revision-tracker-secret-key-12345!";

function createResponse() {
    const response = {
        status: jest.fn(),
        json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    return response;
}

describe("authenticateToken", () => {
    it("rejects requests without a token", () => {
        const request = {
            cookies: {},
            headers: {},
        } as unknown as AuthenticatedRequest;
        const response = createResponse();
        const next = jest.fn();

        authenticateToken(request, response as never, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.json).toHaveBeenCalledWith({
            message: "Access denied. No token provided.",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("rejects an expired token", () => {
        const token = jwt.sign(
            { id: "user-789", email: "expired@example.com" },
            JWT_SECRET,
            { expiresIn: "-1s" },
        );
        const request = {
            cookies: { token },
            headers: {},
        } as unknown as AuthenticatedRequest;
        const response = createResponse();
        const next = jest.fn();

        authenticateToken(request, response as never, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.json).toHaveBeenCalledWith({
            message: "Invalid or expired token.",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("rejects a token signed with the wrong secret", () => {
        const token = jwt.sign(
            { id: "user-999", email: "wrongsecret@example.com" },
            "a-completely-different-secret",
        );
        const request = {
            cookies: { token },
            headers: {},
        } as unknown as AuthenticatedRequest;
        const response = createResponse();
        const next = jest.fn();

        authenticateToken(request, response as never, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.json).toHaveBeenCalledWith({
            message: "Invalid or expired token.",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("accepts a valid cookie token and attaches the user", () => {
        const token = jwt.sign(
            { id: "user-123", email: "user@example.com" },
            JWT_SECRET,
        );
        const request = {
            cookies: { token },
            headers: {},
        } as unknown as AuthenticatedRequest;
        const response = createResponse();
        const next = jest.fn();

        authenticateToken(request, response as never, next);

        expect(request.user).toEqual({
            id: "user-123",
            email: "user@example.com",
        });
        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).not.toHaveBeenCalled();
    });

    it("accepts a valid bearer token from the authorization header", () => {
        const token = jwt.sign(
            { id: "user-456", email: "header@example.com" },
            JWT_SECRET,
        );
        const request = {
            headers: { authorization: `Bearer ${token}` },
        } as unknown as AuthenticatedRequest;
        const response = createResponse();
        const next = jest.fn();

        authenticateToken(request, response as never, next);

        expect(request.user?.id).toBe("user-456");
        expect(next).toHaveBeenCalledTimes(1);
    });

    it("rejects an invalid token", () => {
        const request = {
            cookies: { token: "not-a-valid-token" },
            headers: {},
        } as unknown as AuthenticatedRequest;
        const response = createResponse();
        const next = jest.fn();

        authenticateToken(request, response as never, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.json).toHaveBeenCalledWith({
            message: "Invalid or expired token.",
        });
        expect(next).not.toHaveBeenCalled();
    });
});
