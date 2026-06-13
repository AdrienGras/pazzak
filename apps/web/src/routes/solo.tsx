import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/solo")({
	component: SoloPage,
});

function SoloPage() {
	return <div data-testid="solo-page">Solo (à câbler)</div>;
}
