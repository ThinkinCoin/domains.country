import type {Metadata} from "next";
import "./styles.css";

export const metadata: Metadata = {
    title: "domains.country",
    description: "Registro e administração de domínios .country na Harmony"
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
    return (
        <html lang="pt-BR">
            <body>
                <header className="siteHeader">
                    <a href="/" className="brand">domains.country</a>
                    <span className="networkBadge">Harmony · piloto controlado</span>
                </header>
                {children}
            </body>
        </html>
    );
}
