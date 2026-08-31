export default function AdminPage() {
    return (
        <main>
            <section className="hero">
                <p className="eyebrow">Operação controlada</p>
                <h1>Painel administrativo</h1>
                <p className="lead">A autenticação é por assinatura de uma carteira operadora. A allowlist limita o aplicativo oficial, não chamadas diretas aos contratos Harmony.</p>
            </section>
            <section className="notice">
                <h2>Uso obrigatório</h2>
                <p>Antes de liberar escrita ou DNS, registre a evidência da Fase 0: contrato/ABI/permissões, delegação pai e teste de reversão PowerDNS.</p>
            </section>
        </main>
    );
}
