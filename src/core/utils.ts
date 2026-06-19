export function buildQueryString(
	params: Record<string, string | number | boolean | undefined>
): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined) sp.set(k, String(v));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}
