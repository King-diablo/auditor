import { Audit } from "./core";

const audit = new Audit({});


audit.Log({
    type: "auth",
    action: "login",
    message: "User logged in successfully."
});