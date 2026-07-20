// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PutraToken (PTR) — closed-loop learn-to-earn reward token, Universiti Putra Malaysia
/// @notice Minted only by the platform's conversion service against the audited
///         off-chain points ledger (100 points = 1 PTR). No public sale, no pre-mine.
contract PutraToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public immutable cap;

    constructor(uint256 cap_) ERC20("PutraToken", "PTR") {
        require(cap_ > 0, "cap must be positive");
        cap = cap_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Mint redeemed tokens to a learner's linked wallet.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= cap, "annual cap exceeded");
        _mint(to, amount);
    }
}
