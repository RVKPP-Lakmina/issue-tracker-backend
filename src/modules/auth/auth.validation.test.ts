import { describe, expect, it } from "vitest";
import { signUpSchema } from "./auth.validation";

describe("signUpSchema", () => {
    it("accepts emails with numeric characters", () => {
        const payload = signUpSchema.body.parse({
            name: "Number User",
            email: "user123@example.com",
            password: "password123"
        });

        expect(payload.email).toBe("user123@example.com");
    });

    it("accepts empty avatar string by normalizing it to undefined", () => {
        const payload = signUpSchema.body.parse({
            name: "  Jane Doe  ",
            email: "  JANE@EXAMPLE.COM  ",
            password: "password123",
            avatar: ""
        });

        expect(payload.name).toBe("Jane Doe");
        expect(payload.email).toBe("jane@example.com");
        expect(payload.avatar).toBeUndefined();
    });

    it("accepts null avatar by normalizing it to undefined", () => {
        const payload = signUpSchema.body.parse({
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            avatar: null
        });

        expect(payload.avatar).toBeUndefined();
    });

    it("rejects non-url avatar strings", () => {
        expect(() =>
            signUpSchema.body.parse({
                name: "John Doe",
                email: "john@example.com",
                password: "password123",
                avatar: "not-a-url"
            })
        ).toThrow();
    });
});
