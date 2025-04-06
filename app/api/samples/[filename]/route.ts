// import { NextResponse } from 'next/server';
// import mysql from 'mysql2/promise';

// export async function GET(
//   request: Request,
//   { params }: any
// ) {
//   const { filename } = await params;
//   let connection;

//   try {
//     // Connect to the MySQL database.
//     connection = await mysql.createConnection({
//       host: 'localhost',
//       port: 8080,
//       user: 'root',
//       password: 'password',
//       database: 'samples_db',
//     });

//     // Query to get the file's data.
//     const [rows] = await connection.execute(
//       'SELECT filedata FROM audio_files WHERE filename = ?',
//       [filename]
//     );

//     if (!rows || (rows as any[]).length === 0) {
//       return NextResponse.json(
//         { error: 'File not found' },
//         { status: 404 }
//       );
//     }

//     // Assuming the query returns one result.
//     const fileData = (rows as any)[0].filedata;

//     return new NextResponse(fileData, {
//       status: 200,
//       headers: {
//         'Content-Type': 'audio/mpeg',
//         'Content-Disposition': `attachment; filename="${filename}"`,
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching file:', error);
//     return NextResponse.json(
//       { error: 'Internal Server Error' },
//       { status: 500 }
//     );
//   } finally {
//     if (connection) await connection.end();
//   }
// }