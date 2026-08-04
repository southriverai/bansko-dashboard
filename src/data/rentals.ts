// Bansko Dashboard — rental providers.
//
// The point of this list is coverage over time: everyone who has ever offered a
// place in the Bansko groups, or been suggested by someone else as worth asking.
// Unlike events, entries never expire — a landlord who had a flat free in March is
// still a landlord in October. The store is therefore cumulative: pushes MERGE into
// what's already there rather than replacing it (see src/app/api/rentals/route.ts).
//
// Deliberately NOT modelled: phone numbers, emails, WhatsApp links. People post
// those inside a private group; republishing them on a public page is a different
// act from mentioning that someone rents places. The dashboard tells you who to ask
// and which group to ask in — you go and ask there.

/** How a provider came up: they offered, or somebody else vouched for them. */
export type MentionKind = "offer" | "suggestion";

/** One message that put this provider on the list. */
export type RentalMention = {
  /** WhatsApp group the message appeared in. */
  group: string;
  /** Display name of whoever posted it — the provider on an offer, the recommender on a suggestion. */
  by: string;
  /** ISO-8601 timestamp of the message. */
  at: string;
  kind: MentionKind;
  /** Optional one-line gist of what was said, no contact details. */
  note?: string;
};

/** Someone who rents places out, or who somebody suggested asking. */
export type RentalProvider = {
  /** Stable slug, used as a React key and to merge pushes. */
  id: string;
  /** Name as it appears in the groups — a person, an apartment, or an agency. */
  name: string;
  /** What they let: "2-bed apartment", "studio near the gondola". */
  what?: string;
  where?: string;
  /** Every message that mentioned them, newest first. */
  mentions: RentalMention[];
};

/**
 * Empty on purpose. The rest of the dashboard's static data was transcribed from
 * real messages; there is no equivalent set of rental messages to hand, and making
 * up names of people who supposedly let flats in Bansko would be inventing records
 * about real, identifiable individuals on a public page. The list fills from the
 * first VPS push (/api/rentals); until then the panel says so.
 */
export const RENTALS: RentalProvider[] = [];
