const express = require('express');
const multer = require('multer');
const path = require('path');
const { Client } = require('pg');
const fs = require('fs');

const app = express();

const pgClient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '',
  port: 5432,
  encoding: 'utf8',
});

const initializeDatabase = async () => {
  try {
   
    await pgClient.query('SET CLIENT_ENCODING TO \'UTF8\';');
    console.log('Client encoding set to UTF-8');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    
  }
};


pgClient.connect();
initializeDatabase();

app.use(express.urlencoded({ extended: true })); // Parse form data

// Update file information (name, size, description)
app.post('/files/:id', async (req, res) => {
  const fileId = req.params.id;
  const { fileDescription, newFileName, newFileSize } = req.body;

  try {
    // Update the file metadata in the database (modify as needed)
    await pgClient.query(
      'UPDATE file_metadata SET description = $1, filename = $2, size = $3 WHERE file_id = $4',
      [fileDescription, newFileName, newFileSize, fileId]
    );

    console.log('File metadata updated successfully');
    res.redirect('/'); // Redirect back to the main page or a success page
  } catch (error) {
    console.error('Error updating file metadata:', error);
    res.status(500).send('Error updating file metadata');
  }
});

app.get('/files/:id', async (req, res) => {
  const fileId = req.params.id; 
  try {
    const result = await pgClient.query(
      'SELECT filename, size, description, mime_type FROM file_metadata WHERE file_id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      res.status(404).send('File not found');
    } else {
      // File information found
      const fileData = result.rows[0];
      res.json(fileData);
    }
  } catch (error) {
    console.error('Error retrieving file information:', error);
    res.status(500).send('Error retrieving file information');
  }
});


const filestorageengine = multer.diskStorage({
  destination: (req,file,cb) => {
    cb(null,'./uploades');
  },
  filename:  (req,file,cb) => {
    cb(null,Date.now() + '--' + file.originalname);
  },
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


const upload = multer({storage: filestorageengine});

app.post('/single',upload.single('upload'),async(req ,res) =>{
  const { originalname, size, mimetype } = req.file;
  const description = req.body.fileDescription;
  try {

    console.log('Original Name:', originalname);
    console.log('Size:', size);
    console.log('MIME Type:', mimetype);
    console.log('Description:', description);
   
    // Save metadata and file content to PostgreSQL
    await pgClient.query(
      'INSERT INTO file_metadata (filename, size,description,mime_type) VALUES ($1, $2, $3, $4)',
      [originalname, size, description, mimetype]
    );
    console.log('File metadata saved:', originalname);
    res.send('Single File upload success');

  }catch (error) {
    console.error('Error saving file metadata:', error);
    res.status(500).send('Error saving file metadata');
  }


  console.log(req.file);
  res.send("single File upload success");
});

app.post('/multiple', upload.array('upload', 3), async (req, res) => {
  const uploadedFiles = req.files;
  const description = req.body.fileDescription;

  try {
    // Save metadata for each file to PostgreSQL
    for (const file of uploadedFiles) {
      const { originalname, size, mimetype } = file;
      const utf8OriginalName = Buffer.from(originalname, 'latin1').toString('utf-8');
      const utf8Size = size.toString();
      const utf8size = Buffer.from(utf8Size, 'utf-8').toString();
      const utf8mimetype = Buffer.from(mimetype, 'utf-8').toString();

      console.log('File Metadata:');
      console.log('Original Name:', utf8OriginalName);
      console.log('Size:', utf8size);
      console.log('MIME Type:', utf8mimetype);

      await pgClient.query(
        'INSERT INTO file_metadata (filename, size, description, mime_type) VALUES ($1, $2, $3, $4)',
        [utf8OriginalName, utf8size,description, utf8mimetype]
      );
    }

    console.log('Multiple files metadata saved');
    res.send('Multiple Files Upload Success');
  } catch (error) {
    console.error('Error saving multiple files metadata:', error);
    res.status(500).send('Error saving multiple files metadata');
  }
});
app.post('/files/:id', async (req, res) => {
  const fileId = req.params.id;
  console.log('Received fileId:', fileId); 
  const { fileDescription, newFileName, newFileSize } = req.body;

  try {
    // Update the file metadata in the database (modify as needed)
    await pgClient.query(
      'UPDATE file_metadata SET description = $1, filename = $2, size = $3 WHERE file_id = $4',
      [fileDescription, newFileName, newFileSize, fileId]
    );

    console.log('File metadata updated successfully');
    res.redirect(`/files/${fileId}`); // Redirect back to the file info page
  } catch (error) {
    console.error('Error updating file metadata:', error);
    res.status(500).send('Error updating file metadata');
  }
});





app.listen(5000);

