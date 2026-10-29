import type { DeliveryLanguage } from '@/database/schema';

/**
 * WhatsApp templates the school's business account must have approved, with the text each one
 * renders (for the log and for SMS). Parameters fill {{1}}, {{2}}… in order.
 */
export type TemplateName = 'school_message' | 'school_notice';

type Template = {
	/** Name and body as submitted to Meta; keep both in step with the approved template. */
	body: Record<DeliveryLanguage, (params: string[]) => string>;
};

export const TEMPLATES: Record<TemplateName, Template> = {
	school_message: {
		body: {
			en: ([school, child, text]) =>
				`${school} about ${child}: ${text}\n\nReply here to answer the school.`,
			ur: ([school, child, text]) =>
				`${school} کی طرف سے ${child} کے بارے میں: ${text}\n\nجواب کے لیے یہیں لکھیں۔`,
		},
	},
	school_notice: {
		body: {
			en: ([school, title, text]) => `${school} notice: ${title}\n\n${text}`,
			ur: ([school, title, text]) => `${school} کا اعلان: ${title}\n\n${text}`,
		},
	},
};

/** WhatsApp caps a template parameter; long text is cut with an ellipsis. */
const MAX_PARAM = 1000;

export function templateParams(params: string[]): string[] {
	return params.map((param) =>
		param.length > MAX_PARAM
			? `${param.slice(0, MAX_PARAM - 1)}…`
			: param.replace(/\s*\n\s*/g, ' '),
	);
}

export function renderTemplate(
	name: TemplateName,
	language: DeliveryLanguage,
	params: string[],
): string {
	return TEMPLATES[name].body[language](templateParams(params));
}

/** SMS is one or two segments: the template text, shortened. */
export function smsText(body: string, max = 300): string {
	const flat = body.replace(/\s+/g, ' ').trim();
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
