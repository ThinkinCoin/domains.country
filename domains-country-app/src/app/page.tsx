import {DomainConsole} from "@/components/domain-console";

export default function HomePage() {
    return (
        <main>
            <section className="hero">
                <p className="eyebrow">Registro oficial .country</p>
                <h1>Seu domínio na Harmony, administrado em um só lugar.</h1>
                <p className="lead">
                    Pesquise disponibilidade, acompanhe compromissos locais e consulte o estado on-chain.
                    Operações de escrita permanecem bloqueadas até a aprovação da Fase 0.
                </p>
            </section>
            <DomainConsole />
            <section className="notice" aria-label="Limites do piloto">
                <h2>Limites do piloto</h2>
                <p>
                    A allowlist limita somente este aplicativo. Ela não impede chamadas diretas aos contratos.
                    DNS público depende de delegação válida no registro pai <code>.country</code>.
                </p>
            </section>
        </main>
    );
}
