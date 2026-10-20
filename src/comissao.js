const BONUS_CLIENTE = { PF: 2, PJ: 3 };

function calcularComissao(
  valorVenda,
  percentualBase,
  percentualCliente,
  percentualRegiao,
) {
  const percentualTotal =
    Number(percentualBase) + percentualCliente + Number(percentualRegiao);
  return Number(((Number(valorVenda) * percentualTotal) / 100).toFixed(2));
}

module.exports = { BONUS_CLIENTE, calcularComissao };
