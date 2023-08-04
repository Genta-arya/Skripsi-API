const express = require("express");
const app = express();
const port = 3001;
const bodyparseer = require("body-parser");
const db = require("./koneksi");
const response = require("./response");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const sizeOf = require("image-size");
const fs = require("fs");
const API_URL = "192.168.1.6";

app.use(bodyparseer.json());
app.use(bodyparseer.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "asset")));
app.use("/kecamatan", express.static(path.join(__dirname, "asset")));
app.use("/log", express.static(path.join(__dirname, "asset")));
app.use("/detail/:id_kecamatan", express.static(path.join(__dirname, "asset")));
app.use(
  "/kecamatan/:id_kecamatan",
  express.static(path.join(__dirname, "asset"))
);
app.use("/kecamatan/:id", express.static(path.join(__dirname, "asset")));
app.use("/halaman/:id", express.static(path.join(__dirname, "asset")));
app.use("/api/notifikasi", express.static(path.join(__dirname, "asset")));
app.use("/download-pdf/:fileName", express.static(path.join(__dirname, "asset")));
app.use("/search", express.static(path.join(__dirname, "asset")));


app.listen(port,  () => {
  console.log(`Start server di :${API_URL}:${port}`);
});

app.use(cors());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "asset"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });


app.get("/detail/:id_kecamatan", (req, res) => {
  const id = req.params.id_kecamatan;
  const sql = "SELECT * FROM detail WHERE id_kecamatan = ?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.status(200).json({
        status: 200,
        message: "Data detail berhasil ditemukan",
        data: result,
      });
    } else {
      res.status(404).json({
        status: 404,
        message: "Data detail tidak ditemukan",
      });
    }
  });
});

app.get("/detail/:filename", (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, "asset", filename);

  res.sendFile(imagePath);
});


app.get("/kecamatan", (req, res) => {
  const sql = "SELECT * FROM kecamatan";
  db.query(sql, (err, result) => {
    if (err) throw err;
    response(200, result, "data dari tabel kecamatan", res);
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `SELECT id_admin FROM admin WHERE username = '${username}' AND password = '${password}'`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing login query: " + err.stack);
      return res
        .status(500)
        .send("An error occurred while processing the login.");
    }

    if (results.length === 1) {
      const id_admin = results[0].id_admin;

      res
        .status(200)
        .json({ success: true, adminId: id_admin, message: "Login sukses" });
      console.log("login sukses");
    } else {
      res
        .status(401)
        .json({ success: false, message: "Username dan Password salah." });
      console.log("username dan password salah");
    }
  });
});

app.get("/admin", (req, res) => {
  const sql = "SELECT * FROM detail";
  db.query(sql, (err, result) => {
    if (err) throw err;
    response(200, result, "data dari tabel admin", res);
  });
});

app.get("/log", (req, res) => {
  const sql = "SELECT * FROM log_act";
  db.query(sql, (err, result) => {
    if (err) throw err;
    response(200, result, "data dari tabel log_act", res);
  });
});

app.get("/list-detail", (req, res) => {
  const sql = "SELECT * FROM detail";
  db.query(sql, (err, result) => {
    if (err) throw err;
    response(200, result, "data dari tabel log_act", res);
  });
});

app.post("/upload", upload.single("gambar"), async (req, res) => {
  const gambars = req.file;
  const gambar = gambars ? gambars.filename : null;

  const { nama_kecamatan, id_kecamatan, deskripsi } = req.body;

  // Validasi keberadaan id_kecamatan di database
  const checkQuery = `SELECT COUNT(*) as count FROM kecamatan WHERE id_kecamatan = '${id_kecamatan}'`;
  db.query(checkQuery, (checkErr, checkResult) => {
    if (checkErr) {
      console.error("Gagal memeriksa keberadaan id_kecamatan:", checkErr);
      res.status(500).json({
        success: false,
        message: "Gagal memeriksa keberadaan id_kecamatan.",
      });
      return;
    }

    const count = checkResult[0].count;
    if (count > 0) {
  
      res
        .status(400)
        .json({ success: false, message: "ID kecamatan sudah terdaftar." });
      return;
    }

    const sqlKecamatan = `INSERT INTO kecamatan (id_kecamatan, nama_kecamatan, deskripsi, gambar) VALUES ('${id_kecamatan}','${nama_kecamatan}','${deskripsi}', '${gambar}')`;

    db.query(sqlKecamatan, (err, result) => {
      if (err) {
        console.error("Gagal menyimpan kecamatan:", err);
        res
          .status(400)
          .json({ success: false, message: "id kecamatan telah tersedia." });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Gambar berhasil diunggah dan data disimpan.",
      });

      const sqlLogs = `INSERT INTO log_act (id_admin, id_kecamatan, nama_kecamatan, ket_act, deskripsi, gambar) VALUES ("100", '${id_kecamatan}', '${nama_kecamatan}', "Posting data kecamatan ", '${deskripsi}', '${gambar}')`;
      db.query(sqlLogs, (err, result) => {
        if (err) {
          console.error("Gagal menyimpan kecamatan:", err);
          return;
        }

        console.log("Log act berhasil disimpan.");
      });
    });
  });
});

app.post("/log", upload.single("gambar"), async (req, res) => {
  const gambars = req.file;
  const gambar = gambars ? gambars.filename : null;
  const { nama_kecamatan, id_kecamatan, deskripsi, ket_act, id_admin } =
    req.body;

  if (gambars) {
    const imageDimensions = sizeOf(gambars.path);
    if (imageDimensions.width !== 500 || imageDimensions.height !== 500) {
 
      fs.unlinkSync(gambars.path);

      return res.status(400).json({
        success: false,
        message: "Ukuran gambar harus 500 x 500 piksel.",
      });
    }
  }
  const sqlLogs = `INSERT INTO log_act (id_admin, id_kecamatan, nama_kecamatan, ket_act, deskripsi, gambar) VALUES ('${id_admin}', '${id_kecamatan}', '${nama_kecamatan}', '${ket_act}', '${deskripsi}', '${gambar}')`;

  db.query(sqlLogs, (err, result) => {
    if (err) {
      console.error("Gagal menyimpan kecamatan:", err);
      res
        .status(400)
        .json({ success: false, message: "id kecamatan telah tersedia." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Gambar berhasil diunggah dan data disimpan.",
    });
    console.log(result);
  });
});

app.post("/detail", upload.single("gambar"), async (req, res) => {
  const gambars = req.file;
  const gambar = gambars ? gambars.filename : null;
  const { nama_kecamatan, id_kecamatan, deskripsi, pembangunan, profil } =
    req.body;


  if (gambars) {
    const imageDimensions = sizeOf(gambars.path);
    if (imageDimensions.width !== 500 || imageDimensions.height !== 500) {
  
      fs.unlinkSync(gambars.path);

      return res.status(400).json({
        success: false,
        message: "Ukuran gambar harus 500 x 500 piksel.",
      });
    }
  }

  const sqlLogs = `INSERT INTO detail (id_kecamatan, nama_kecamatan, pembangunan, deskripsi ,profil) VALUES ( '${id_kecamatan}', '${nama_kecamatan}', '${pembangunan}', '${deskripsi}', '${profil}')`;

  db.query(sqlLogs, (err, result) => {
    if (err) {
      console.error("Gagal menyimpan kecamatan:", err);
      res
        .status(500)
        .json({ success: false, message: "Gagal menyimpan kecamatan." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Gambar berhasil diunggah dan data disimpan.",
    });
    console.log(result);
  });
});



app.delete("/kecamatan/:id_kecamatan", (req, res) => {
  const id_kecamatan = parseInt(req.params.id_kecamatan);

  const sql = "DELETE FROM kecamatan WHERE id_kecamatan = ?";
  db.query(sql, [id_kecamatan], (err, result) => {
    if (err) {
      res
        .status(500)
        .json({ message: "Terjadi kesalahan dalam menghapus data" });
      throw err;
    }

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Data berhasil dihapus" });
      console.log("data berhasil dihapus");
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
      console.log("data gagal dihapus");
    }
  });
});

app.delete("/detail/:id_kecamatan", (req, res) => {
  const id_kecamatan = parseInt(req.params.id_kecamatan);

  const sql = "DELETE FROM detail WHERE id = ?";
  db.query(sql, [id_kecamatan], (err, result) => {
    if (err) {
      res
        .status(500)
        .json({ message: "Terjadi kesalahan dalam menghapus data" });
      throw err;
    }

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Data berhasil dihapus" });
      console.log("data berhasil dihapus");
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
      console.log("data gagal dihapus");
    }
  });
});

app.get("/halaman/:id", (req, res) => {
  const id = req.params.id;

  const sql = "SELECT * FROM detail WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      res
        .status(500)
        .json({ message: "Terjadi kesalahan dalam mengambil data" });
      throw err;
    }

    if (result.length > 0) {
      const detailData = result[0];
      res.status(200).json(detailData);
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
    }
  });
});

app.post("/logs", async (req, res) => {
  try {

    const {
      id_admin,
      ket_act,
      nama_kecamatan,
      id_kecamatan,
      deskripsi,
      gambar,
    } = req.body;

    // Lakukan operasi penyimpanan kegiatan log ke dalam tabel log_act
    const query = `INSERT INTO log_act (id_admin,ket_act, nama_kecamatan, id_kecamatan, deskripsi, gambar)
                   VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [
      id_admin,
      ket_act,
      nama_kecamatan,
      id_kecamatan,
      deskripsi,
      gambar,
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Gagal menyimpan kegiatan log:", err);
        res
          .status(500)
          .json({ error: "Terjadi kesalahan saat menyimpan kegiatan log" });
      } else {
        console.log("Kegiatan log berhasil disimpan:", result);
        res.json({ message: "Kegiatan log berhasil disimpan" });
      }
    });
  } catch (error) {
    console.error("Gagal menyimpan kegiatan log:", error);
    res
      .status(500)
      .json({ error: "Terjadi kesalahan saat menyimpan kegiatan log" });
  }
});

app.post("/post/detail", upload.array("gambar", 3), (req, res) => {
  const {
    id_kecamatan,
    nama_kecamatan,
    bidang,
    judul,
    anggaran,
    lokasi,
    koordinat,
    tahun,
  } = req.body;
  const gambar = req.files.map((file) => file.filename);

 
  const query = `INSERT INTO detail (id_kecamatan, nama_kecamatan, bidang, judul, anggaran, lokasi, koordinat, tahun, gambar1, gambar2, gambar3)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

 
  db.query(
    query,
    [
      id_kecamatan,
      nama_kecamatan,
      bidang,
      judul,
      anggaran,
      lokasi,
      koordinat,
      tahun,
      gambar[0],
      gambar[1],
      gambar[2],
    ],
    (error, results) => {
      if (error) {
        console.error("Gagal menyimpan data kecamatan:", error);
        res
          .status(500)
          .json({ success: false, error: "Gagal menyimpan data kecamatan" });
      } else {
        console.log("Data kecamatan berhasil disimpan");
        res.json({
          success: true,
          message: "Data kecamatan berhasil disimpan",
        });
      }
    }
  );
});

app.post("/api/notifikasi", upload.array("gambar", 3), (req, res) => {
  const { id_kecamatan, nama_kecamatan, pesan } = req.body;
  const gambar = req.files.map((file) => file.filename);

  if (!id_kecamatan || !nama_kecamatan || !pesan || !gambar) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

 
  const query = `INSERT INTO notifikasi (id_kecamatan, nama_kecamatan, pesan, gambar)
                 VALUES (?, ?, ?, ?)`;

 
  db.query(
    query,
    [id_kecamatan, nama_kecamatan, pesan, gambar[0]],
    (error, results) => {
      if (error) {
        console.error("Gagal menyimpan data kecamatan:", error);
        return res
          .status(500)
          .json({ success: false, error: "Gagal menyimpan data kecamatan" });
      }

      console.log("Data kecamatan berhasil disimpan");
      res.json({ success: true, message: "Data notifikasi berhasil disimpan" });

      
      setTimeout(() => {
        const deleteQuery = "DELETE FROM notifikasi WHERE id_kecamatan = ?";
        db.query(deleteQuery, [id_kecamatan], (deleteError, deleteResults) => {
          if (deleteError) {
            console.error("Gagal menghapus data kecamatan:", deleteError);
          } else {
            console.log("Data kecamatan berhasil dihapus");
          }
        });
      }, 7200000);
    }
  );
});

app.get("/api/notifikasi", (req, res) => {
  const sql = "SELECT * FROM notifikasi";
  db.query(sql, (err, result) => {
    if (err) throw err;
    response(200, result, "data dari tabel notifikasi", res);
  });
});

app.delete("/api/notifikasi", (req, res) => {
  const sql = "DELETE FROM notifikasi";
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ message: "Notifikasi berhasil dihapus" });
  });
});

app.delete("/log", (req, res) => {
  const sql = "DELETE FROM log_act";
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ message: "Notifikasi berhasil dihapus" });
  });
});
app.put("/kecamatan/:id", (req, res) => {
  const id = req.params.id;
  const id_kecamatan = req.body.id_kecamatan;
  const nama_kecamatan = req.body.nama_kecamatan;

  const sql =
    "UPDATE kecamatan SET nama_kecamatan = ?, id_kecamatan = ? WHERE id = ?";
  db.query(sql, [nama_kecamatan, id_kecamatan, id], (err, result) => {
    try {
      if (err) {
        throw err;
      }

      if (result.affectedRows > 0) {
        res.status(200).json({ message: "Data kecamatan berhasil diperbarui" });
        console.log("Data kecamatan berhasil diperbarui");
      } else {
        res.status(404).json({ message: "Data kecamatan tidak ditemukan" });
        console.log("Data kecamatan tidak ditemukan");
      }
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Kode Pos telah tersedia",
        });
      console.error("Kode Post telah tersedia");
    }
  });
});

app.put("/update-gambar/:id", upload.single("gambar"), (req, res) => {
  const id = req.params.id;
  const gambar = req.file ? req.file.filename : null;

  const sql = "UPDATE kecamatan SET gambar = ? WHERE id = ?";
  db.query(sql, [gambar, id], (err, result) => {
    if (err) {
      res
        .status(500)
        .json({
          message: "Terjadi kesalahan dalam memperbarui gambar kecamatan",
        });
      throw err;
    }

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Gambar kecamatan berhasil diperbarui" });
      console.log("Gambar kecamatan berhasil diperbarui");
    } else {
      res.status(404).json({ message: "Data kecamatan tidak ditemukan" });
      console.log("Data kecamatan tidak ditemukan");
    }
  });
});

app.get("/kecamatan/:id", (req, res) => {
  const id = req.params.id;

  const sql = "SELECT * FROM kecamatan WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      res
        .status(500)
        .json({ message: "Terjadi kesalahan dalam mengambil data kecamatan" });
      throw err;
    }

    if (result.length > 0) {
      const kecamatan = result[0];
      res.json(kecamatan);
    } else {
      res.status(404).json({ message: "Data kecamatan tidak ditemukan" });
    }
  });
});

app.post("/upload-pdf", upload.single("pdf"), (req, res) => {
  const { nis, nisn, nama } = req.body;
  const pdf = req.file;

  if (!pdf) {
    res.status(400).json({ message: "File PDF tidak ditemukan" });
    return;
  }

  // Mendapatkan ekstensi file PDF
  const pdfExtension = path.extname(pdf.originalname);

  // Format penamaan file: IJASA-NIS.pdf
  const fileName = `IJASAH-${nis}${pdfExtension}`;

  // Path tujuan untuk menyimpan file PDF
  const destinationPath = path.join(__dirname, "asset", fileName);

  // Memindahkan file PDF ke path tujuan
  fs.rename(pdf.path, destinationPath, (err) => {
    if (err) {
      res.status(500).json({ message: "Terjadi kesalahan dalam menyimpan file PDF" });
      throw err;
    }

    // Simpan nama file ke database
    const sql = "INSERT INTO data_siswa (nis, nisn, nama, ijasah) VALUES (?, ?, ?, ?)";
    db.query(sql, [nis, nisn, nama, fileName], (err, result) => {
      if (err) {
        res.status(500).json({ message: "Terjadi kesalahan dalam menyimpan data PDF" });
        throw err;
      }

      res.status(200).json({ message: "Data PDF berhasil disimpan" });
    });
  });
});



app.get("/search", (req, res) => {
  const { nis } = req.query;

  // Lakukan pencarian data berdasarkan NIS di database
  const sql = "SELECT * FROM data_siswa WHERE nis = ?";
  db.query(sql, [nis], (err, result) => {
    if (err) {
      res.status(500).json({ message: "Terjadi kesalahan dalam melakukan pencarian data" });
      throw err;
    }

    if (result.length > 0) {
      res.status(200).json({ data: result });
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
    }
  });
});


app.get("/download-pdf/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "asset", fileName);

  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading PDF:", err);
      res.status(500).json({ message: "Terjadi kesalahan dalam mengunduh file PDF" });
    }
  });
});
