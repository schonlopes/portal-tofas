# Portal TOFAS — Fase 8

Site estático para GitHub Pages. Usa Firebase Authentication (Google) e Firestore, com regras de acesso por escola. Nenhum dado nominal ou credencial administrativa está incluído.

## Publicação

1. No GitHub, abra `schonlopes/portal-tofas`.
2. Envie `index.html`, `styles.css` e `app.js` para a **raiz** do repositório (Add file > Upload files > Commit changes).
3. Em Settings > Pages, escolha Deploy from a branch, `main`, `/ (root)`.
4. Em Firebase Authentication > Settings > Authorized domains, confirme `schonlopes.github.io`.
5. Acesse https://schonlopes.github.io/portal-tofas/ após o deploy.

## Testes obrigatórios

- Admin `lopes.willian@escola.pr.gov.br`: lista de 54 escolas e visão agregada.
- Admin `henry.pedroso@escola.pr.gov.br`: mesmas permissões.
- Professor autorizado: somente escolas vinculadas.
- Conta não cadastrada: acesso negado.
- Teste com usuário de escola A tentando ler dados da escola B, preferencialmente pelo simulador de regras do Firestore.

## Observações importantes

- Não altere as regras `firestore.rules` da Fase 7 para regras permissivas. Elas precisam continuar publicadas.
- O código do site é público; a proteção real está nas regras Firestore. Não coloque JSON de estudantes, autorizações, chaves de serviço nem arquivos de importação no GitHub.
- A coleção `estudantes` atualmente contém nome, CGM, turma, série e indicadores booleanos; **não contém URLs individuais dos PDFs**. Por isso esta primeira versão mostra a disponibilidade por nível, mas não inventa botões de download. Para adicionar links diretos será necessário enriquecer a importação com URLs reais do Drive e revisar permissões.
- A contagem de relatórios é a soma de ocorrências por nível, não o número de estudantes únicos com relatório.
- As consultas aos estudantes são feitas por escola, sem consulta global; a tabela tem paginação de exibição, mas carrega os registros da escola selecionada.
- Se o Firebase SDK 13.1.0 estiver indisponível, substitua as URLs do SDK por uma versão oficialmente disponível e consistente nos três imports.
