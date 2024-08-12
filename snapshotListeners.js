const { onSnapshot, doc } = require("firebase/firestore");
const db = require("./firebase");

let maintenance_mode = false;
let messages = {
  multitasking_error: {
    english:
      "⏳ Oops! Multitasking isn't my strong suit. Please wait while I figure out the previous message. 😅",
    bangla:
      "⏳ Oops! Multitasking isn't my strong suit. Please wait while I figure out the previous message. 😅",
  },
  processing_error: {
    english:
      "Sorry, there was an error processing your request. Please try again later.",
    bangla:
      "Sorry, there was an error processing your request. Please try again later.",
  },
  maintenance_mode: {
    english:
      "Our servers are currently ongoing maintenance. Please try again later.",
    bangla:
      "Our servers are currently ongoing maintenance. Please try again later.",
  },
};

const unsub_1 = onSnapshot(
  doc(db, "GlobalData", "maintenanceModeTG"),
  (snapshot) => {
    maintenance_mode = snapshot.data().status;
  }
);

const unsub_2 = onSnapshot(
  doc(db, "RepliesAndPrefixes", "whisperBridge"),
  (snapshot) => {
    try {
      messages = snapshot.data().bot_replies;
    } catch (err) {
      console.log(err);
    }
  }
);

const getMaintenanceModeStatus = () => {
  return maintenance_mode;
};

const getMessages = () => {
  return messages;
};

module.exports = { unsub_1, unsub_2, getMaintenanceModeStatus, getMessages };
