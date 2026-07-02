const express = require('express');
const multer = require('multer');
const router = express.Router();
const { supabase } = require('../lib/supabase');

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const BUCKET = 'post-media';

const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de ficheiro não suportado. Usa imagem (jpg, png, gif, webp) ou vídeo (mp4, webm, mov).'));
    }
    cb(null, true);
  }
});

// POST /api/upload -> envia um ficheiro (imagem ou vídeo) do PC, guarda-o
// permanentemente no armazenamento do Supabase e devolve o URL público.
// form-data: { file, author_id }
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Não foi possível enviar o ficheiro.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }

    const authorId = (req.body && req.body.author_id) || 'anon';
    const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase();
    const path = `${authorId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('[upload] erro a enviar para o Supabase Storage:', uploadError);
      return res.status(500).json({ error: 'Não foi possível guardar o ficheiro. Confirma que o bucket "post-media" existe (corre o supabase_setup_v6.sql).' });
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return res.status(201).json({
      url: publicUrlData.publicUrl,
      media_type: mediaType
    });
  });
});

module.exports = router;
