import {
	FetchMessageObject,
	ImapFlow,
	ImapFlowOptions,
	MailboxLockObject,
	SearchObject,
} from 'imapflow'
import {
	AddressObject,
	Attachment as _Attachment,
	simpleParser,
} from 'mailparser'

interface NameAndAddress {
	name: string
	address: string
}

interface Attachment {
	buffer: ArrayBufferLike
	mimetype: string
	size: number
	originalname?: string
}

interface EmailData {
	seq: number
	uid: number
	from?: NameAndAddress[]
	to: NameAndAddress[]
	cc: NameAndAddress[]
	bcc: NameAndAddress[]
	date?: Date
	subject?: string
	html?: string
	text?: string
	textAsHtml?: string
	attachments: Attachment[]
	flags: Set<string>
	labels: Set<string>
	size: number
	threadId: string
	references?: string | string[]
	replyTo?: NameAndAddress[]
	messageId?: string
	inReplyTo?: string
}

export class ImapClient {
	imap: ImapFlow
	lock: MailboxLockObject | undefined

	constructor(config: ImapFlowOptions) {
		this.imap = new ImapFlow(config)
	}

	async connect() {
		try {
			await this.imap.connect()
			return 'ready'
		} catch (err) {
			return err
		}
	}

	async logout() {
		try {
			this.lock?.release()
			await this.imap.logout()
			return 'logged out'
		} catch (err) {
			return err
		}
	}

	async openBox(boxName = 'INBOX') {
		try {
			this.lock = await this.imap.getMailboxLock(boxName)
			return boxName
		} catch (err) {
			return err
		}
	}

	async fetchEmails(query: SearchObject) {
		try {
			const emails: EmailData[] = []
			const results = await this.imap.search(query)
			console.log('-----------------', { results }, '-----------------')

			if (results.length === 0) {
				return emails
			}

			/**
			 * Here we can define all the information we want from the emails
			 */
			const fetch = this.imap.fetch(results, {
				source: true, // NOTE: Necessary
				// envelope: true,
				// bodyStructure: true,
				// bodyParts: [''],
				// headers: true,
				// internalDate: true,
				flags: true, // NOTE: Could be useful but not necessary
				labels: true, // NOTE: Could be useful but not necessary
				size: true, // NOTE: Could be useful but not necessary
				threadId: true, // NOTE: Could be useful but not necessary
				// uid: true,
			})

			for await (let message of fetch) {
				const email = await this.processMessage(message)
				emails.push(email)
			}

			return emails
		} catch (err) {
			console.log(err)
		}
	}

	private async processMessage(
		message: FetchMessageObject
	): Promise<EmailData> {
		const parsed = await simpleParser(message.source)

		return {
			seq: message.seq,
			uid: message.uid,
			from: this.extractNameAndAddress(parsed.from),
			to: this.extractNameAndAddress(parsed.to as AddressObject),
			cc: this.extractNameAndAddress(parsed.cc as AddressObject),
			bcc: this.extractNameAndAddress(parsed.bcc as AddressObject),
			date: parsed.date,
			subject: parsed.subject,
			html: this.extractHTML(parsed.html),
			text: parsed.text,
			textAsHtml: parsed.textAsHtml,
			attachments: this.extractAttachments(parsed.attachments),
			flags: message.flags,
			labels: message.labels,
			size: message.size,
			threadId: message.threadId,
			references: parsed.references,
			replyTo: this.extractNameAndAddress(parsed.replyTo),
			messageId: parsed.messageId,
			inReplyTo: parsed.inReplyTo,
		}
	}

	private extractNameAndAddress(data?: AddressObject): NameAndAddress[] {
		if (!data) return []

		return data?.value?.map((e) => ({
			name: e.name,
			address: e.address ?? '',
		}))
	}

	private extractHTML(html: string | false): string | undefined {
		return html === false ? undefined : html
	}

	private extractAttachments(attachments: _Attachment[]): Attachment[] {
		return attachments.map((e) => ({
			buffer: e.content.buffer,
			mimetype: e.contentType,
			size: e.content.buffer.byteLength,
			originalname: e.filename,
		}))
	}
}
