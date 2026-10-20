# Sistema de vendas e comissões

API REST acadêmica em Node.js, Express e MySQL. O projeto contém apenas o necessário para cadastrar vendedores, registrar vendas com comissão calculada e consultar indicadores.

## Requisitos

- Node.js 18 ou superior
- MySQL 8 ou superior (servidor e cliente de linha de comando)

## Instalação e execução

### Instalação local do MySQL no Windows

1. Instale e inicie o MySQL Server, incluindo o MySQL Command Line Client.
2. Copie `.env.example` para `.env` e configure usuário e senha do MySQL.
3. No PowerShell, na raiz do projeto, execute `Get-Content -Raw .\database\schema.sql | mysql -u root -p`.
4. Carregue os dados uma única vez com `Get-Content -Raw .\database\seed.sql | mysql -u root -p db_vendas`.
5. Instale as dependências com `npm install` e inicie com `npm start`.

No Prompt de Comando ou Bash, os comandos SQL equivalentes usam `< database/schema.sql` e `< database/seed.sql`.

## Rotas

| Método | Endpoint | Uso |
| --- | --- | --- |
| POST | `/vendedores` | Cadastra vendedor (`nome`, `meta_mensal`, `percentual_base`) |
| GET | `/vendedores` | Lista vendedores |
| GET | `/vendedores/:id` | Consulta vendedor |
| PUT | `/vendedores/:id` | Atualiza `meta_mensal` e `percentual_base` |
| PATCH | `/vendedores/:id/desativar` | Desativa sem apagar vendas |
| PATCH | `/vendedores/:id/ativar` | Reativa vendedor |
| POST | `/vendas` | Registra venda (`codigo_venda`, `id_vendedor`, `id_regiao`, `valor_venda`, `tipo_cliente`; `data_venda` opcional) |
| GET | `/vendas` | Lista vendas com vendedor e região |
| GET | `/vendas/vendedor/:id` | Filtra vendas por vendedor |
| GET | `/vendas/regiao/:id` | Filtra vendas por região |
| DELETE | `/vendas/:id` | Exclui venda existente |
| GET | `/relatorios/performance?inicio=2026-10-01&fim=2026-10-31` | Retorna indicadores do período |

`id_regiao`: 1 Norte, 2 Nordeste, 3 Sudeste e 4 Sul. Tipos de cliente: `PF` e `PJ`. O relatório mensal considera as datas inicial e final informadas, inclusive.

## Comissão

`valor_venda × (percentual_base + bônus_cliente + bônus_região) / 100`. Bônus do cliente: PF 2%, PJ 3%. Bônus regional: Norte 1%, Nordeste 1%, Sudeste 0% e Sul 0,5%. O cálculo está centralizado em `src/comissao.js`.

## Teste manual no Postman/Insomnia

Use `Content-Type: application/json`. Exemplo para cadastrar vendedor:

```json
{
  "nome": "João Silva",
  "meta_mensal": 10000,
  "percentual_base": 5
}
```

Exemplo para registrar venda:

```json
{
  "codigo_venda": "V016",
  "id_vendedor": 1,
  "id_regiao": 1,
  "valor_venda": 2000,
  "tipo_cliente": "PJ"
}
```

Com base de 5%, PJ (3%) e Norte (1%), a comissão desse exemplo é R$ 180,00. Para gerar as capturas solicitadas no enunciado, execute as requisições acima e salve as telas de request/response no Postman ou Insomnia.

## Verificações cobertas pelos dados de exemplo

O `seed.sql` carrega cinco vendedores e quinze vendas, distribuídas pelas quatro regiões e entre PF/PJ. Depois de carregar os dados, confira o relatório de outubro, tente reutilizar um `codigo_venda`, registre venda com vendedor inativo ou região inválida, atualize uma meta e consulte os filtros por vendedor e região. Erros de validação retornam 400, recursos inexistentes 404 e falhas inesperadas 500.
