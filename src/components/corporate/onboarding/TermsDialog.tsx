"use client";

/**
 * The GCB Internet Banking (Corporate) Terms & Conditions, word for word from the bank's form GCB/IBCAF/2014/038
 * (designer, 2026-11-26). Agreeing unlocks only once the reader reaches the end, as on Trade Hub. The text is the
 * bank's and is kept exactly as printed, including its numbering (there is no section 9) and its typos; corrections
 * are the bank's to make. Not translated: it is a legal document, shown as issued.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Clause = string | { text: string; sub: string[] };

interface TermsSection {
  heading: string;
  /** Plain paragraphs, for sections with no lettered clauses. */
  paragraphs?: string[];
  /** Lettered clauses: a), b), c)… */
  clauses?: Clause[];
}

const DEFINITIONS = [
  "‘The Bank’ means GCB Bank Limited (GCB)",
  "‘The Customer’ means a customer of GCB Bank Limited who is now or henceforth registered on the GCB Internet Banking Service.",
  "‘The Service’ means GCB Bank Limited Internet Banking Service.",
];

const SECTIONS: TermsSection[] = [
  {
    heading: "1. HARDWARE AND SOFTWARE REQUIREMENTS",
    clauses: [
      "The customer shall access the Service by use of a hardware device such as a personal computer, cell phone or similar technology and the necessary Internet browser software and hardware, connected to the Internet through the Customer’s preferred Internet access service.",
      "The Customer shall remain solely responsible for the purchase and maintenance of the hardware device and associated Internet browser software.",
    ],
  },
  {
    heading: "2. CONFIDENTIALITY",
    clauses: [
      "The Customer shall initiate all Internet Banking transactions or inquiries by use of its Internet banking password in combination with the assigned user name or login Identity (ID).",
      "The Customer shall not create a password that will be easy for others to determine as its password. It is advisable to use a combination of upper and lower alphabets and at least one number as a character.",
      "The Customer shall keep password (confidential).",
      "The Customer shall not give or disclose password (to anyone).",
      "The Customer shall not store, write or display password in any place. All passwords shall be memorised by users to prevent a third party accessing it.",
      "The Customer shall change password immediately upon realisation of leakage to a third party.",
      {
        text: "",
        sub: [
          "Where a customer notifies the bankin writing of a breach of the confidentiality of his password, the Bank shall immediately deactivate the user and the Customer shall immediately send a request for the regeneration of a new password to the bank.",
          "A Customer who forgets password shall submit a formal request to the bank to reset the password. The Bank shall not be responsible for any loss that occurs between the period of such memory loss and the time the new password is reset.",
          "The Bank shall not be liable for any loss that occurs after such memory loss or breach of password confidentiality and before the new password was reset.",
        ],
      },
      "The Bank shall not be liable for any or all transactions carried out on the Customer’s account under request from the usage of the service if the confidentiality of any password is breached and the Bank is not notified.",
      "The use of the Customer’s password by its employee or any other person with its authorisation shall be considered the same as the Customer’s mandate authorising the Bank to complete any transaction or request communicated through the Service.",
      "The Customer may at any time replace its users and may notify the Bank in writing if it so wishes.",
      "The Customer shall be responsible for any instruction given to the Bank through the Service. Accordingly the Bank shall not be responsible for any fraudulent, erroneous or duplicate instructions given to the Bank through the Service.",
      "The Customer shall not share its password with unauthorised persons and the sharing of the Customer’s password shall be at its sole risk and peril.",
      "The Customer shall after viewing the account log out of the Service and close the browser software.",
      "The Customer shall not leave the computer or electronic device unattended to as at the time of accessing the service.",
    ],
  },
  {
    heading: "3. THE CUSTOMER’S RESPONSIBILITIES",
    clauses: [
      "The Customer shall be solely responsible for safeguarding its password. Accordingly, the Bank is expressly exempted from any liability arising from unauthorised access to the Customer’s account as a result of the Customer’s failure to safeguard its password.",
      "The Customer shall ensure the secrecy of its password. Accordingly, the Bank is expressly exempted from any liability arising from the Customer’s breach of its duty of secrecy.",
      "The Customer shall read notices posted on the Bank’s website in relation to the Service at all times. The Bank shall not be liable for any loss arising out of the Customer’s failure to read and comply with instructions contained in these notices.",
    ],
  },
  {
    heading: "4. CUSTOMER INFORMATION",
    clauses: [
      "The Customer should provide true, accurate, current and complete information about themselves as requested by the Bank in the registration form. The Customer shall not misrepresent his/her identity.",
      "The Customer shall not use the Service for any illegal purpose or for the transmission of any unlawful, libellous, offensive or obscene material.",
      "The Customer shall not assign or make any commercial use of the Service.",
      "The content and information in this Terms and Conditions and on the Bank’s website as well as all rights to the website are the property of the Bank. The Customer is only permitted to use this content and information as expressly authorised by the Service. Accordingly, the Customer shall not copy, reproduce, distribute, or create any derivative work from this content and information.",
    ],
  },
  {
    heading: "5. BUSINESS DAYS AND NOTICE OF INTERRUPTION",
    clauses: [
      "The Customer agrees that the Bank may occasionally perform maintenance on systems and equipments and this may result in error messages or interrupted services.",
      "The Customer agrees that the Bank cannot guarantee that it may be able to provide notice of such interruptions, although it will try to do so.",
    ],
  },
  {
    heading: "6. UNCLEARED FUNDS",
    clauses: [
      "The Customer agrees that account information provided through the Internet shall not reflect cheque deposits made since the end of the preceding business day, which are yet to be cleared.",
    ],
  },
  {
    heading: "7. INTERNET BANKING SERVICE",
    clauses: [
      "The Customer may use Internet Banking to perform any of the services available to the customer and listed in Schedule 1 attached hereto.",
      "The Customer may sign up the Service by picking up an application form at any GCB branch or downloading it off the Bank’s website and submitting the duly completed application form to the nearest branch of the Bank or the Customer’s Relationship Manager.",
    ],
  },
  {
    heading: "8. LIMITS ON BANK’S LIABILITY",
    clauses: [
      "To the fullest extent permitted by law, the Bank shall not be liable whatsoever for any loss, damage, or claim arising out of any delay or failure in the performance of any Internet Banking service in accordance with the Terms and Conditions including but not limited to, except that resulting from the Bank’s intentional misconduct or negligence.",
      "The Bank’s duties and responsibilities to the customer are strictly limited to those described in this Terms and Conditions. In no event will the Bank be liable for any consequential, special or punitive damages, or for any direct or indirect loss, that the customer may incur or suffer in connection with the service, even if the bank has been informed of the possibility of such damages.",
      "To the fullest extent permitted by law, the Bank shall not be liable at any time to the Customer or any other person for any loss, charge, fee, penalty, expense or other damage resulting from any failure or delay of the performance of the Bank’s reasonable control, including without limitation, legal restraint, interruption of transmission or communication facilities, equipment failure, electrical or computer failure, war, emergency conditions, act of God, fire, storm, or other catastrophe.",
      "The Bank shall not be liable for the Customer’s use of any information obtained via the Internet or Internet access service provider’s network. Such information is obtained at the customer’s own risk and internet access service provider’s network. The Bank cannot guarantee the accuracy or security of any internet or network content.",
      "The Service is provided on an ‘as is’ and ‘as available’ basis and the Bank expressly disclaims all warranties of any kind whether express or implied, including, without limitation, any warranty of non-infringement, merchantability or fitness for particular purpose.",
      "The Bank shall not be liable whatsoever for any damage or loss caused by the action or inaction, error or omission of the Customer or any other person.",
      "The Bank shall not be liable for any fraud or loss that arises from the use of the Customer’s password.",
      "The Bank shall not be responsible for any electronic virus(es) that the Customer may encounter in the use of this Service.",
    ],
  },
  {
    heading: "10. LIABILITY FOR UNAUTHORISED OR ERRONEOUS TRANSFERS",
    clauses: [
      "The Customer shall be responsible for all unauthorised or erroneous transactions initiated through Internet & Mobile Banking.",
      "The Customer shall immediately notify the Bank if his/her password or pin is lost or stolen, or if someone has transferred funds from his/her account through Internet or Mobile Banking without his/her permission.",
    ],
  },
  {
    heading: "11. ADDITIONAL SERVICES",
    clauses: [
      "The Bank may from time to time, make additional Services available through Internet and Mobile Banking and will notify the Customer of the availability and terms of these new Services.",
      "The Customer, by using these additional services when they become available, agrees to be bound by any additional instructions, procedures and terms provided to him/her concerning these new Services.",
    ],
  },
  {
    heading: "12. FEES AND CHARGES",
    paragraphs: [
      "The Services are available for a fee and charges determined by the Bank from time to time. The Customer agrees to pay and authorises the Bank to debit his/her account for Internet and Mobile Banking Services. The fees and charges are subject to changes without notice to the Customer.",
    ],
  },
  {
    heading: "13. INDEMNITY",
    paragraphs: [
      "Except when caused by the Bank’s intentional conduct or gross negligence, the Customer agrees to protect and fully compensate the Bank and its affiliates and service providers from any/and all third party claims, liability, damages, expenses and costs (including, but not limited to, legal fees), caused by or arising from the Customer’s use of the Services, violation or infringement of the Terms and Conditions or infringement by any other user of the Customer’s account, of any intellectual property or other right of anyone.",
    ],
  },
  {
    heading: "14. SERVICE CHANGES AND DISCONTINUATION",
    clauses: [
      "The Bank reserves the right to change or discontinue, temporarily or permanently the service at any time without notice to the Customer. In order to maintain the security and integrity of the Service, the Bank may also suspend the Customer’s access to the service at anytime without notice.",
      "The Bank will not be liable to the Customer or any third party for any modification or discontinuation of the service.",
      "The Customer may cancel the Service by written request to the Bank at any time.",
    ],
  },
  {
    heading: "15. NOTICES",
    clauses: [
      "All notices and other communications to the Customer shall be in writing and delivered to the address / email address the Customer has provided to the Bank.",
      "All notices and other communications to the Bank from the Customer shall be in writing and delivered to the Bank’s address.",
    ],
  },
  {
    heading: "16. SETTLEMENT OF DISPUTES",
    paragraphs: [
      "Any dispute arising from the Terms and Conditions, shall be settled amicably and where attempt at amicable settlement is unsuccessful, by arbitration in accordance with the Alternative Dispute Resolution Act, 2010 (Act 768) or any statutory modification or replacement thereof.",
      "The parties may, by written agreement, waive reference of any dispute arising under the Terms and Conditions to arbitration so that any dispute may be adjudicated by a court of competent jurisdiction.",
    ],
  },
  {
    heading: "17. GOVERNING LAW",
    paragraphs: [
      "These Terms and Conditions and the rights and obligations of the Bank and the Customer shall be governed by and construed in accordance with the laws of Ghana.",
    ],
  },
  {
    heading: "18. JURISDICTION",
    paragraphs: [
      "The courts of Ghana shall have exclusive jurisdiction in any action or proceeding relating to these Terms and Conditions.",
    ],
  },
];

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const ROMAN = ["i", "ii", "iii", "iv", "v"];

export default function TermsDialog({
  open,
  onOpenChange,
  onAgree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  function check() {
    const el = body.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReachedEnd(true);
  }

  // Each time it opens, reading starts again from the top.
  useEffect(() => {
    if (!open) return;
    setReachedEnd(false);
    const t = window.setTimeout(check, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Terms &amp; Conditions</DialogTitle>
        </DialogHeader>
        <DialogBody ref={body} onScroll={check} className="gap-5 text-body leading-relaxed text-foreground">
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">GCB INTERNET BANKING (CORPORATE) TERMS &amp; CONDITIONS</h3>
            <h4 className="font-medium">DEFINITIONS</h4>
            <p className="text-muted-foreground">These expressions in the Terms and Conditions shall have the following meanings:</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              {DEFINITIONS.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              In consideration of GCB allowing the Customer access to the Service, the Customer agrees with the Bank as
              follows:
            </p>
          </section>

          {SECTIONS.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h4 className="font-medium">{section.heading}</h4>
              {section.paragraphs?.map((p) => (
                <p key={p} className="text-muted-foreground">
                  {p}
                </p>
              ))}
              {section.clauses && (
                <ol className="flex flex-col gap-1.5 text-muted-foreground">
                  {section.clauses.map((clause, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-5 shrink-0">{`${LETTERS[i]})`}</span>
                      {typeof clause === "string" ? (
                        <span>{clause}</span>
                      ) : (
                        <ol className="flex flex-col gap-1.5">
                          {clause.sub.map((s, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="w-6 shrink-0">{`(${ROMAN[j]})`}</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {/* Agreeing unlocks at the end; until then the button says so itself. */}
          <Button
            disabled={!reachedEnd}
            onClick={() => {
              onAgree();
              onOpenChange(false);
            }}
          >
            {reachedEnd ? "I Accept" : "Read to the End"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
