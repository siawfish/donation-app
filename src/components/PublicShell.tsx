import Navbar from "./ui/navbar";
import Footer from "./Footer";

/**
 * The frame every public page shares.
 *
 * Previously each page assembled its own `Navbar` + `main` + `Footer`, and the
 * pages added later were built without either — which left the blog and careers
 * sections with no way back to the rest of the site at all. One shell means a
 * new public page cannot be built without navigation, because the navigation is
 * not the page's job.
 */
export default function PublicShell({
    children,
    /** Browse surfaces manage their own vertical rhythm. */
    flush,
}: {
    children: React.ReactNode;
    flush?: boolean;
}) {
    return (
        <div className="flex flex-col min-h-[100dvh] bg-canvas">
            <Navbar />
            <div className={`flex-1 ${flush ? "" : "bg-canvas"}`}>{children}</div>
            <Footer />
        </div>
    );
}
