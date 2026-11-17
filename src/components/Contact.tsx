import { CONTACT_EMAIL } from "@/lib/contact";

export default function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <>l&apos;adresse e-mail indiquée sur l&apos;écran de connexion Google</>
  );
}
