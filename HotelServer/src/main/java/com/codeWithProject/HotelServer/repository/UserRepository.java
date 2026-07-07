package com.codeWithProject.HotelServer.repository;

import com.codeWithProject.HotelServer.entity.User;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User,Long> {


    Optional<User> findFirstByEmail(String email);

    @Modifying
    @Transactional
    @Query(value = """
            update user
            set user_role = 'CUSTOMER'
            where email <> 'admin@test.com'
              and (user_role is null or trim(user_role) = '' or user_role = 'ADMIN')
            """, nativeQuery = true)
    int normalizeCustomerRoles();

    @Modifying
    @Transactional
    @Query(value = """
            update user
            set user_role = 'ADMIN'
            where email = 'admin@test.com'
              and (user_role is null or trim(user_role) = '' or user_role <> 'ADMIN')
            """, nativeQuery = true)
    int normalizeAdminRole();
}
