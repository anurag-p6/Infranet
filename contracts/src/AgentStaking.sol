// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentStaking
/// @notice Agent providers lock a native MON bond when they list an agent on
///         InferNet. The stake is refundable when the agent is delisted and can
///         be slashed by the platform owner for misbehavior. Stakes are keyed by
///         the off-chain agent id string so the marketplace can verify them.
contract AgentStaking {
    struct Stake {
        address staker;
        uint256 amount;
        uint256 stakedAt;
        bool active;
    }

    address public owner;
    uint256 public minStake;
    uint256 public totalStaked;

    mapping(bytes32 => Stake) private _stakes;

    event Staked(bytes32 indexed agentKey, string agentId, address indexed staker, uint256 amount);
    event Withdrawn(bytes32 indexed agentKey, string agentId, address indexed staker, uint256 amount);
    event Slashed(
        bytes32 indexed agentKey,
        string agentId,
        address indexed staker,
        uint256 amount,
        address indexed to
    );
    event MinStakeUpdated(uint256 oldMinStake, uint256 newMinStake);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    error NotOwner();
    error BelowMinStake(uint256 sent, uint256 required);
    error AlreadyStaked(string agentId);
    error NoActiveStake(string agentId);
    error NotStaker();
    error ZeroAddress();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(uint256 _minStake) {
        owner = msg.sender;
        minStake = _minStake;
        emit OwnerUpdated(address(0), msg.sender);
        emit MinStakeUpdated(0, _minStake);
    }

    /// @notice Deterministic key for an agent id string.
    function agentKey(string calldata agentId) public pure returns (bytes32) {
        return keccak256(bytes(agentId));
    }

    /// @notice Lock a MON bond for an agent before it is listed.
    function stake(string calldata agentId) external payable {
        if (msg.value < minStake) revert BelowMinStake(msg.value, minStake);

        bytes32 key = keccak256(bytes(agentId));
        Stake storage s = _stakes[key];
        if (s.active) revert AlreadyStaked(agentId);

        s.staker = msg.sender;
        s.amount = msg.value;
        s.stakedAt = block.timestamp;
        s.active = true;
        totalStaked += msg.value;

        emit Staked(key, agentId, msg.sender, msg.value);
    }

    /// @notice Refund the bond to the original staker when delisting an agent.
    function withdraw(string calldata agentId) external {
        bytes32 key = keccak256(bytes(agentId));
        Stake storage s = _stakes[key];
        if (!s.active) revert NoActiveStake(agentId);
        if (s.staker != msg.sender) revert NotStaker();

        uint256 amount = s.amount;
        s.active = false;
        s.amount = 0;
        totalStaked -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(key, agentId, msg.sender, amount);
    }

    /// @notice Platform owner can slash a misbehaving agent's bond.
    function slash(string calldata agentId, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();

        bytes32 key = keccak256(bytes(agentId));
        Stake storage s = _stakes[key];
        if (!s.active) revert NoActiveStake(agentId);

        uint256 amount = s.amount;
        address staker = s.staker;
        s.active = false;
        s.amount = 0;
        totalStaked -= amount;

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Slashed(key, agentId, staker, amount, to);
    }

    function setMinStake(uint256 _minStake) external onlyOwner {
        emit MinStakeUpdated(minStake, _minStake);
        minStake = _minStake;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Full stake details for an agent id.
    function stakeOf(string calldata agentId)
        external
        view
        returns (address staker, uint256 amount, uint256 stakedAt, bool active)
    {
        Stake storage s = _stakes[keccak256(bytes(agentId))];
        return (s.staker, s.amount, s.stakedAt, s.active);
    }

    /// @notice Whether an agent currently has an active bond.
    function isStaked(string calldata agentId) external view returns (bool) {
        return _stakes[keccak256(bytes(agentId))].active;
    }
}
