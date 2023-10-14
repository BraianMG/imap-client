import { config } from 'dotenv'
import { ImapClient } from './ImapClient'
config()

const main = async () => {
	const imap = new ImapClient({
		host: process.env.IMAP_HOST || '',
		port: Number(process.env.IMAP_PORT) ?? 993,
		secure: true,
		auth: {
			user: process.env.IMAP_USER || '',
			pass: process.env.IMAP_PASSWORD, // NOTE: Application password
		},
	})

	const conection = await imap.connect()
	console.log('-----------------', { conection }, '-----------------')

	const boxName = await imap.openBox()
	console.log('-----------------', { boxName }, '-----------------')

	/**
	 * IMAP Limitation: https://github.com/postalsys/imapflow/issues/88
	 * Searching by date and time ignores the time, nor can you provide a time zone.
	 * So if we use "2023-10-22T17:30:06.364Z" in the search, the server will read it as "2023-10-22".
	 * There is no way to know how the server processes that part of the date, it could be UTC or the local date where the server is hosted.
	 */
	const now = new Date()
	const since = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
	)
	since.setDate(since.getDate() - 2)

	/**
	 * Here we can use many more options to search for emails
	 */
	const emails = await imap.fetchEmails({
		since,
	})

	emails?.forEach((email) => {
		console.log('\x1b[31m%s\x1b[0m', '====================================== EMAIL SEPARATOR ======================================')
		console.log({ ...email })
		console.log('\x1b[31m%s\x1b[0m', '====================================== EMAIL SEPARATOR ======================================')
	})

	await imap.logout()
}

main().catch((err) => console.error(err))
