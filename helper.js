exports.rawValueToDecimal = (rawValue, decimal = 18) =>
    Number(BigInt(rawValue) / BigInt(10 ** (decimal - 2))) / 100
