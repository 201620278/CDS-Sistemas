const express = require('express');
const { imprimirCupomEscPos } = require('../services/escposPrinter');

const router = express.Router();

router.post('/cupom', async (req, res) => {
  try {
    await imprimirCupomEscPos(req.body || {});
    res.json({ success: true, message: 'Cupom enviado para impressora ESC/POS.' });
  } catch (error) {
    console.error('Erro ao imprimir cupom ESC/POS:', error);
    res.status(500).json({
      success: false,
      error: 'Falha ao imprimir via ESC/POS.',
      details: error.message
    });
  }
});

module.exports = router;
