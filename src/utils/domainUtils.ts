export function getEffectiveExcludedDomains(
	apiUrl: string,
	configuredDomains: string[]
): string[] {
	const domains = [...configuredDomains];
	const apiHostname = extractHostname(apiUrl);

	if (apiHostname) {
		domains.push(apiHostname);
	}

	return uniqueNormalizedDomains(domains);
}

export function parseDomainList(value: string): string[] {
	return uniqueNormalizedDomains(value.split(/[\n,]/g));
}

export function formatDomainList(domains: string[]): string {
	return uniqueNormalizedDomains(domains).join(', ');
}

export function isUrlExcluded(url: string, domains: string[]): boolean {
	const hostname = extractHostname(url);
	if (!hostname) {
		return false;
	}

	return domains.some((domain) => {
		return hostname === domain || hostname.endsWith(`.${domain}`);
	});
}

export function extractHostname(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	try {
		return new URL(trimmed).hostname.toLowerCase();
	} catch {
		try {
			return new URL(`https://${trimmed}`).hostname.toLowerCase();
		} catch {
			return null;
		}
	}
}

function uniqueNormalizedDomains(domains: string[]): string[] {
	const uniqueDomains = new Set<string>();

	for (const domain of domains) {
		const normalizedDomain = normalizeDomain(domain);
		if (normalizedDomain) {
			uniqueDomains.add(normalizedDomain);
		}
	}

	return Array.from(uniqueDomains);
}

function normalizeDomain(domain: string): string | null {
	const hostname = extractHostname(domain);
	if (hostname) {
		return hostname;
	}

	const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
	return trimmed || null;
}
