// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

//
//                      .:::::::::.
//                   .:::::::::::::::.
//                 .:::::::::::::::::::.
//                .:::::::::::::::::::::.
//                ::::::           ::::::
//                :::::   o     o   :::::
//                ::::::           ::::::
//                .:::::::::::::::::::::.
//              .:::::::::::::::::::::::::.
//           .:::::::::::::::::::::::::::::::.
//         .:::::::::::::::::::::::::::::::::::.
//        .:::::::::::::::::::::::::::::::::::::.
//
//                viderunt te antequam esses.
//
// this is not a token. there is nothing to buy. happy hunting.

import {ERC721} from "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts@5.0.2/access/Ownable.sol";

/// @title they · seen
/// @notice viderunt te antequam esses.
contract Seen is ERC721, Ownable {
    // ---------------------------------------------------------------
    // state
    // ---------------------------------------------------------------

    uint256 public next = 1;                 // signum sequens
    address public archivum;                 // the surveyor
    string  private uri;                     // base for tokenURI

    mapping(address => uint256) public signumOf;   // one per wallet, 0 = unseen
    // one slot per soul: [0..127] eight epochs (16b each) | [128..191] first block | [192..223] total txs
    mapping(uint256 => uint256) public descriptio;
    mapping(uint256 => bool)    public auris;      // ear registered
    mapping(uint256 => bool)    public sera;       // ...but late. forever late.
    mapping(bytes32 => bool)    public clavisUsed; // every key belongs to one ear
    mapping(address => bool)    public damnatus;   // key-thieves. no doors, ever.
    mapping(uint256 => bool)    public fur;        // the thief's certificate

    // ---------------------------------------------------------------
    // events
    // ---------------------------------------------------------------

    event Visus(address indexed qui, uint256 indexed signum);
    event Auditus(uint256 indexed signum);
    event Sera(uint256 indexed signum);            // the one mistake, recorded
    event Damnatio(address indexed qui);           // the unforgivable one
    event Absolutio(address indexed qui);          // ...unless the archive relents
    event Descriptus(uint256 indexed signum);

    // ---------------------------------------------------------------

    constructor(string memory uri_) ERC721("they", "THEY") Ownable(msg.sender) {
        archivum = msg.sender;
        uri = uri_;
    }

    // ---------------------------------------------------------------
    // the door
    // ---------------------------------------------------------------

    /// @notice say the word.
    function seen() external {
        _seen(msg.sender);
    }

    /// @notice say the word, and grow an ear.
    /// @param pgp your armored PGP public key — paste the whole block, BEGIN to END. the archive will speak to it.
    function seen(string calldata pgp) external {
        require(bytes(pgp).length > 0, "clavis vacua");
        bytes32 h = keccak256(bytes(pgp));
        if (clavisUsed[h]) {
            // a stolen key. they paid; they may keep a certificate.
            uint256 f = _seen(msg.sender);
            fur[f] = true;
            damnatus[msg.sender] = true;
            emit Damnatio(msg.sender);
            return;
        }
        clavisUsed[h] = true;
        uint256 s = _seen(msg.sender);
        auris[s] = true;
        emit Auditus(s);
        // the key itself lives forever in this transaction's calldata.
    }

    /// @notice grow an ear after the fact. mercy is granted; the lateness is not forgotten.
    /// @param pgp your armored PGP public key — paste the whole block, BEGIN to END.
    function audi(string calldata pgp) external {
        require(!damnatus[msg.sender], "damnatus es");
        uint256 s = signumOf[msg.sender];
        require(s != 0, "nondum visus");
        require(!auris[s], "iam audit");
        require(bytes(pgp).length > 0, "clavis vacua");
        bytes32 h = keccak256(bytes(pgp));
        if (clavisUsed[h]) {
            fur[s] = true;                  // the map they earned becomes the word
            damnatus[msg.sender] = true;
            emit Damnatio(msg.sender);
            return;
        }
        clavisUsed[h] = true;
        auris[s] = true;
        sera[s]  = true;
        emit Auditus(s);
        emit Sera(s);
    }

    function _seen(address qui) internal returns (uint256 s) {
        require(!damnatus[qui], "damnatus es");
        require(signumOf[qui] == 0, "iam visus");
        s = next++;
        signumOf[qui] = s;
        _safeMint(qui, s);
        emit Visus(qui, s);
    }

    // ---------------------------------------------------------------
    // the archive
    // ---------------------------------------------------------------

    /// @notice the survey. one packed word per soul. correctable by the archive.
    function describe(uint256 signum, uint256 verbum) external {
        require(msg.sender == archivum, "non archivum");
        _requireOwned(signum);
        descriptio[signum] = verbum;
        emit Descriptus(signum);
    }

    /// @notice many souls, one transaction.
    function describeMany(uint256[] calldata signa, uint256[] calldata verba) external {
        require(msg.sender == archivum, "non archivum");
        require(signa.length == verba.length, "impar");
        for (uint256 i = 0; i < signa.length; i++) {
            _requireOwned(signa[i]);
            descriptio[signa[i]] = verba[i];
            emit Descriptus(signa[i]);
        }
    }

    /// @notice the archive may lift a damnation it judges wrongful.
    function absolvo(address qui) external onlyOwner {
        damnatus[qui] = false;
        uint256 s = signumOf[qui];
        if (s != 0) fur[s] = false;
        emit Absolutio(qui);
    }

    function setArchivum(address a) external onlyOwner {
        archivum = a;
    }

    function setUri(string calldata u) external onlyOwner {
        uri = u;
    }

    // ---------------------------------------------------------------
    // soulbound
    // ---------------------------------------------------------------

    function _update(address to, uint256 id, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(id);
        require(from == address(0), "non transferibilis");
        return super._update(to, id, auth);
    }

    // ---------------------------------------------------------------
    // views
    // ---------------------------------------------------------------

    function _baseURI() internal view override returns (string memory) {
        return uri;
    }

    /// @notice epoch k (0..7) of a signum.
    function aetas(uint256 signum, uint8 k) external view returns (uint16) {
        require(k < 8, "octo aetates");
        return uint16(descriptio[signum] >> (k * 16));
    }

    /// @notice first-seen block of a signum.
    function primus(uint256 signum) external view returns (uint64) {
        return uint64(descriptio[signum] >> 128);
    }

    /// @notice total transactions of a signum.
    function summa(uint256 signum) external view returns (uint32) {
        return uint32(descriptio[signum] >> 192);
    }

    /// @notice has the archive described this signum yet?
    function descriptus(uint256 signum) external view returns (bool) {
        return descriptio[signum] != 0;
    }
}
