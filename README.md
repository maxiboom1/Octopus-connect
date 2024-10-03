Octopus-connect 
Connects to octopus NRCS server using MOS protocol. Provide GFX plugin

MOS message encoding:

```
The supported character encoding is ISO 10646 (Unicode) in UCS-2, as defined in The Unicode Standard, version 2.0. All MOS message contents are transmitted in Unicode, high-order byte first, also known as "big endian."
```

To convert message, recieved from NCS, we need to swap the buffer byte order in-place (.swap16()), and than encode it to string as little endian:

```
this.client.on('data', (data) => {
    data.swap16().toString('utf16le');
});
```

To send string in UCS-2 big endian we need to convert string to UCS-2 big-endian:

```
Buffer.from(string, 'utf16le').swap16();
```