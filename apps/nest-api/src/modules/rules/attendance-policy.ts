import * as z from 'zod';

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM');

/** How long teachers may change a mark after roll call closes, in hours; null means no limit. */
export const TEACHER_EDIT_WINDOWS = [2, 24, 48, 168] as const;

/**
 * A school's attendance rules. Plain data, validated here and evaluated by the pure functions in
 * `attendance-rules.ts`; the AI may help someone fill it in, never decide it.
 */
export const attendancePolicySchema = z
	.object({
		/** After this, roll call for the day is closed and unmarked students are followed up. */
		rollCallClosesAt: clockTime,
		/** The bell. Arriving after it (plus the grace period) counts as late, not absent. */
		lateAfter: clockTime,
		graceMinutes: z.number().int().min(0).max(120),
		autoMarkAbsent: z.object({
			enabled: z.boolean(),
			/** Students nobody has marked by this time are marked absent. */
			at: clockTime,
		}),
		/** A guardian's sick or away message excuses the absence. */
		excuseFromGuardianMessage: z.boolean(),
		gate: z.object({
			/** A gate scan marks the student present; teachers can still change it. */
			scanMarksPresent: z.boolean(),
			/** A scan after the bell and grace period marks the student late instead. */
			scanAfterBellIsLate: z.boolean(),
		}),
		teacherEditWindowHours: z
			.union([z.literal(2), z.literal(24), z.literal(48), z.literal(168)])
			.nullable(),
		absenceAlert: z.object({
			enabled: z.boolean(),
			/** Minutes after roll call closes before the guardian is told; quiet hours push it later. */
			delayMinutes: z.number().int().min(0).max(240),
		}),
	})
	.strict()
	.superRefine((policy, context) => {
		if (policy.lateAfter >= policy.rollCallClosesAt) {
			context.addIssue({
				code: 'custom',
				path: ['lateAfter'],
				message: 'The late time must be before roll call closes',
			});
		}
		if (policy.autoMarkAbsent.enabled && policy.autoMarkAbsent.at < policy.rollCallClosesAt) {
			context.addIssue({
				code: 'custom',
				path: ['autoMarkAbsent', 'at'],
				message: 'Marking absent must happen at or after roll call closes',
			});
		}
	});

export type AttendancePolicy = z.infer<typeof attendancePolicySchema>;

/** What a school starts with, matching the Figma defaults. */
export function defaultAttendancePolicy(graceMinutes = 15): AttendancePolicy {
	return {
		rollCallClosesAt: '09:00',
		lateAfter: '08:15',
		graceMinutes,
		autoMarkAbsent: { enabled: true, at: '09:30' },
		excuseFromGuardianMessage: true,
		gate: { scanMarksPresent: true, scanAfterBellIsLate: true },
		teacherEditWindowHours: 24,
		absenceAlert: { enabled: true, delayMinutes: 15 },
	};
}
