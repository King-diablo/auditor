import { Audit } from "./core";

const audit = new Audit({ destinations: ["console", "file"] });

audit.Log({
    type: "auth",
    action: "login",
    message: "User logged in successfully."
});