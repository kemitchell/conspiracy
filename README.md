[conspiracy] is a simple HTTP server used to run an anonymizing private
mailing list using the [Mailgun] API.

[conspiracy]: https://npmjs.com/packages/conspiracy

[Mailgun]: https://mailgun.com

Only members may send to the list.  The list strips signatures and
address information from every inbound message, and redistributes
to each member.  Private [mailing list] plus [anonymous remailer]
equals self-enforcing [Chatham House Rule] for e-mail based discussion.

[mailing list]: https://en.wikipedia.org/wiki/Electronic_mailing_list

[anonymous remailer]: https://en.wikipedia.org/wiki/Anonymous_remailer

[Chatham House Rule]: https://www.chathamhouse.org/about/chatham-house-rule

# Environment Configuration

- `PORT`: port for HTTP server

- `MAILGUN_API_KEY`: Mailgun API credential

  The list will use this key to redistribute messages.

- `DOMAIN`: mailing list domain name.

  The list will redistribute messages `From: list@DOMAIN`.

- `POST_PATH`: a hard-to-guess HTTP request path

  Configure a Mailgun route to post to this path.

- `DISTRIBUTION_LIST`: path of a text file containing a
  newline-delimited list of list member e-mail addresses
