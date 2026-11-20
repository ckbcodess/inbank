/**
 * Answers to what customers ask most, grouped by topic. Each answer says only what the app actually does, and links
 * to the place it's done when there is one. Copy to be checked by the bank before launch (see WORKING_LOG).
 */

export const FAQ_TOPICS = ["Payments", "Cards and Cash", "Accounts", "Security and Login"] as const;
export type FaqTopic = (typeof FAQ_TOPICS)[number];

export interface Faq {
  id: string;
  topic: FaqTopic;
  question: string;
  answer: string;
  link?: { href: string; label: string };
}

export const FAQS: Faq[] = [
  {
    id: "otp",
    topic: "Payments",
    question: "Why do I need a code for every payment?",
    answer:
      "Every payment, including scheduled ones, is approved with a 6-digit code sent to your phone by SMS. If the SMS is slow, dial the shortcode shown on the code screen to see it. The code proves it’s you, so never share it with anyone, including bank staff.",
  },
  {
    id: "arrive",
    topic: "Payments",
    question: "My transfer hasn’t arrived. What should I do?",
    answer:
      "Transfers to GCB accounts and mobile money wallets usually land within minutes. Transfers to other banks can take longer. Check the transaction’s receipt first. If it says Successful and the money still hasn’t arrived, tap Report Issue on the receipt. We’ll trace it with the other bank.",
    link: { href: "/transactions", label: "Go to transactions" },
  },
  {
    id: "wrong-person",
    topic: "Payments",
    question: "I sent money to the wrong person. Can I get it back?",
    answer:
      "Tap Report Issue on the transaction’s receipt straight away. We’ll contact the receiving bank, but a payment can only be returned with the recipient’s agreement, so we can’t promise it. To avoid this, check the name we show before you enter the amount.",
    link: { href: "/transactions", label: "Go to transactions" },
  },
  {
    id: "standing",
    topic: "Payments",
    question: "How do I stop a scheduled payment?",
    answer: "Open Scheduled Payments, choose the payment and pause or cancel it. Stopping one doesn’t need a code.",
    link: { href: "/payments/standing", label: "Go to scheduled payments" },
  },
  {
    id: "block-card",
    topic: "Cards and Cash",
    question: "I’ve lost my card. How do I block it?",
    answer:
      "Open Cards, choose the card and block it. It stops working at once, and you can unblock it if you find it. If you think someone has used it, report an issue too.",
    link: { href: "/cards", label: "Go to cards" },
  },
  {
    id: "cardless",
    topic: "Cards and Cash",
    question: "How does cardless cash work?",
    answer:
      "You create a one-time code for a set amount and send it to yourself or someone else. It’s used once at a GCB ATM, without a card, and expires if it isn’t used in time. Find an ATM that offers it in Locate us.",
    link: { href: "/locate-us", label: "Find an ATM" },
  },
  {
    id: "virtual",
    topic: "Cards and Cash",
    question: "Can I get a card to pay online?",
    answer: "Yes. A virtual card is ready as soon as you request it, and you can use it to pay online straight away.",
    link: { href: "/cards", label: "Go to cards" },
  },
  {
    id: "statement",
    topic: "Accounts",
    question: "How do I get a bank statement?",
    answer:
      "Open the account and place a request for a statement. Choose the dates and whether you want a PDF or an Excel file.",
    link: { href: "/accounts", label: "Go to accounts" },
  },
  {
    id: "balances",
    topic: "Accounts",
    question: "What’s the difference between available and ledger balance?",
    answer:
      "Your available balance is what you can spend now. Your ledger balance also counts money that is on its way in or out but hasn’t cleared yet, such as a cheque.",
  },
  {
    id: "hide",
    topic: "Accounts",
    question: "Can I hide my balance on screen?",
    answer: "Yes. Use the eye button beside any balance. Amounts stay hidden everywhere in the app until you show them again.",
  },
  {
    id: "forgot",
    topic: "Security and Login",
    question: "I forgot my password. What do I do?",
    answer:
      "Choose Forgot password on the login screen and follow the steps. If you’re locked out after too many tries, visit any branch with your Ghana Card.",
    link: { href: "/forgot-password", label: "Reset your password" },
  },
  {
    id: "scam",
    topic: "Security and Login",
    question: "Someone called asking for my code. Is that the bank?",
    answer:
      "No. GCB will never ask for your PIN, password or a one-time code, by phone, SMS, WhatsApp or email. Hang up and report it.",
  },
  {
    id: "new-phone",
    topic: "Security and Login",
    question: "I’ve changed my phone. Will my login still work?",
    answer:
      "Yes. Log in as usual. The first time on a new phone we send a code to confirm it’s you, and you can then trust the new device.",
  },
];
