import { Audit } from "./core";

const audit = new Audit({});

audit.Log({
    "type": "another",
    "action": "testing",
    "message": "testing my log"
});